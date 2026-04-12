"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { HardDriveUpload } from "lucide-react";

// Extend the session user type to include our custom field
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  preferMetric?: boolean;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const user = session?.user as SessionUser | undefined;
  const preferMetric = user?.preferMetric ?? false;

  const [metric, setMetric] = useState(preferMetric);
  const [savingPref, setSavingPref] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

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
      } else {
        toast.error(data.error ?? "Backup failed.");
      }
    } catch {
      toast.error("Backup request failed.");
    } finally {
      setBackingUp(false);
    }
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
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Uploads a copy of the recipe database to the configured Google Drive folder.
          </p>
          <Button onClick={triggerBackup} loading={backingUp} variant="outline">
            <HardDriveUpload size={16} />
            Backup to Google Drive
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
