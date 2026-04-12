export async function register() {
  // Only run the backup scheduler in the Node.js server runtime (not Edge, not build)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS = 60_000; // check every 60 seconds

  setInterval(async () => {
    try {
      const { db } = await import("@/lib/db");
      const settings = await db.backupSettings.findUnique({ where: { id: "singleton" } });

      if (!settings?.enabled) return;

      const now = Date.now();
      const intervalMs = settings.intervalHours * 60 * 60 * 1000;
      const lastBackup = settings.lastBackupAt?.getTime() ?? 0;

      if (now - lastBackup < intervalMs) return;

      console.log("[backup-scheduler] Starting scheduled backup...");

      const { runBackup, enforceRetention } = await import("@/lib/backup");
      const filename = await runBackup();

      await db.backupSettings.update({
        where: { id: "singleton" },
        data: { lastBackupAt: new Date() },
      });

      await enforceRetention(settings.retentionCount);

      console.log(`[backup-scheduler] Backup complete: ${filename}`);
    } catch (err) {
      console.error("[backup-scheduler] Scheduled backup failed:", err);
    }
  }, INTERVAL_MS);
}
