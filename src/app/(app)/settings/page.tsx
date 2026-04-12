"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { CloudUpload, RotateCcw } from "lucide-react";

// Extend the session user type to include our custom field
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  preferMetric?: boolean;
}

interface BackupSettings {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
  lastBackupAt: string | null;
}

interface BackupFile {
  key: string;
  size: number;
  lastModified: string | null;
}

const INTERVAL_OPTIONS = [
  { value: 6, label: "Every 6 hours" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Daily" },
  { value: 48, label: "Every 2 days" },
  { value: 168, label: "Weekly" },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const user = session?.user as SessionUser | undefined;
  const preferMetric = user?.preferMetric ?? false;

  const [metric, setMetric] = useState(preferMetric);
  const [savingPref, setSavingPref] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // Backup schedule state
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: false,
    intervalHours: 24,
    retentionCount: 5,
    lastBackupAt: null,
  });
  const [savingBackup, setSavingBackup] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadBackupSettings = async () => {
    const response = await fetch("/api/backup/settings");
    if (response.ok) {
      setBackupSettings(await response.json());
    }
  };

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const response = await fetch("/api/backup");
      const data = await response.json();
      if (response.ok) {
        setBackupFiles(data.backups ?? []);
      } else {
        toast.error(data.error ?? "Failed to load backups.");
      }
    } catch {
      toast.error("Failed to load backups.");
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    void loadBackupSettings().catch(() => {});
    void loadBackups().catch(() => {});
  }, []);

  const savePreference = async (value: boolean) => {
    setMetric(value);
    setSavingPref(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferMetric: value }),
      });
      if (res.ok) {
        await update(); // refresh session
        toast.success("Preference saved.");
      } else {
        toast.error("Failed to save preference.");
        setMetric(!value);
      }
    } catch {
      toast.error("Something went wrong.");
      setMetric(!value);
    } finally {
      setSavingPref(false);
    }
  };

  const triggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Backup complete: ${data.filename}`);
        await Promise.all([loadBackupSettings(), loadBackups()]);
      } else {
        toast.error(data.error ?? "Backup failed.");
      }
    } catch {
      toast.error("Backup request failed.");
    } finally {
      setBackingUp(false);
    }
  };

  const saveBackupSettings = async (updates: Partial<BackupSettings>) => {
    const next = { ...backupSettings, ...updates };
    setBackupSettings(next);
    setSavingBackup(true);
    try {
      const res = await fetch("/api/backup/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled,
          intervalHours: next.intervalHours,
          retentionCount: next.retentionCount,
        }),
      });
      if (res.ok) {
        const saved: BackupSettings = await res.json();
        setBackupSettings(saved);
        toast.success("Backup settings saved.");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save backup settings.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSavingBackup(false);
    }
  };

  const openRestoreDialog = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!selectedBackup) return;

    setRestoring(true);
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selectedBackup.key }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Restore complete. Reload the app to see restored data.");
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
        await Promise.all([loadBackupSettings(), loadBackups()]);
      } else {
        toast.error(data.error ?? "Restore failed.");
      }
    } catch {
      toast.error("Restore request failed.");
    } finally {
      setRestoring(false);
    }
  };

  const formatLastBackup = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Account</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Name:</span> {user?.name ?? "—"}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Email:</span> {user?.email ?? "—"}
          </p>
        </CardContent>
      </Card>

      {/* Measurement preference */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Measurements</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            When viewing recipes, automatically convert US measurements (cups, oz, lbs…) to metric.
          </p>
          <Switch
            checked={metric}
            onCheckedChange={savePreference}
            label="Always show metric measurements"
            className={savingPref ? "opacity-60 pointer-events-none" : ""}
          />
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Backup</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Uploads a compressed backup of the database and photos to Cloudflare R2. You can also restore an earlier backup.
          </p>
          <Button onClick={triggerBackup} loading={backingUp} variant="outline">
            <CloudUpload size={16} />
            Backup now
          </Button>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Automatic backups</h3>

            <Switch
              checked={backupSettings.enabled}
              onCheckedChange={(v) => saveBackupSettings({ enabled: v })}
              label="Enable scheduled backups"
              className={savingBackup ? "opacity-60 pointer-events-none" : ""}
            />

            {backupSettings.enabled && (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="interval" className="text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    id="interval"
                    value={backupSettings.intervalHours}
                    onChange={(e) => saveBackupSettings({ intervalHours: Number(e.target.value) })}
                    disabled={savingBackup}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <Input
                    label="Backups to keep"
                    type="number"
                    min={1}
                    max={100}
                    value={backupSettings.retentionCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v >= 1 && v <= 100) setBackupSettings((s) => ({ ...s, retentionCount: v }));
                    }}
                    onBlur={() => saveBackupSettings({ retentionCount: backupSettings.retentionCount })}
                    disabled={savingBackup}
                  />
                  <p className="text-xs text-gray-500">
                    Older backups beyond this count are automatically deleted.
                  </p>
                </div>
              </>
            )}

            <p className="text-xs text-gray-500">
              Last backup: {formatLastBackup(backupSettings.lastBackupAt)}
            </p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-900">Restore backup</h3>
              <Button onClick={() => void loadBackups()} variant="ghost" size="sm" disabled={loadingBackups}>
                Refresh list
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Restoring replaces the current database and uploaded photos with the selected backup.
            </p>

            <div className="space-y-2">
              {loadingBackups && <p className="text-sm text-gray-500">Loading backups…</p>}

              {!loadingBackups && backupFiles.length === 0 && (
                <p className="text-sm text-gray-500">No backups found in R2 yet.</p>
              )}

              {!loadingBackups &&
                backupFiles.map((backup) => (
                  <div
                    key={backup.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{backup.key}</p>
                      <p className="text-xs text-gray-500">
                        {formatLastBackup(backup.lastModified)} · {formatFileSize(backup.size)}
                      </p>
                    </div>
                    <Button onClick={() => openRestoreDialog(backup)} variant="outline" size="sm">
                      <RotateCcw size={14} />
                      Restore
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => {
          if (restoring) return;
          setRestoreDialogOpen(false);
          setSelectedBackup(null);
        }}
        title="Restore backup"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will replace the current recipe database and uploaded photos with the selected backup.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
            {selectedBackup?.key ?? "No backup selected."}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRestoreDialogOpen(false);
                setSelectedBackup(null);
              }}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRestore} loading={restoring}>
              Restore backup
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
