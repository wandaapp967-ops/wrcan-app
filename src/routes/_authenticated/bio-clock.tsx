import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { buildClockInsert, createAttendanceHash } from "@/lib/bio-clock";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/bio-clock")({
  head: () => ({
    meta: [
      { title: "WRCAN Bio-Clock — GPS Attendance" },
      {
        name: "description",
        content: "Record GPS-only clock-in and clock-out events with a private attendance history.",
      },
      { property: "og:title", content: "WRCAN Bio-Clock — GPS Attendance" },
      {
        property: "og:description",
        content: "A private GPS attendance ledger for WRCAN members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BioClockPage,
});

type ClockType = "IN" | "OUT";
type ClockLog = Tables<"clock_logs">;
type GeoFix = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
};

const clockLogsKey = (userId: string) => ["bio-clock-logs", userId] as const;

function readGpsPosition(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser does not provide GPS location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp || Date.now(),
        });
      },
      (error) => {
        const message = error.code === 1
          ? "Location permission was denied. Allow location access in your browser and try again."
          : error.code === 2
            ? "Your device could not get a location. Turn on location services and retry."
            : "GPS took too long. Try again in an open area.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function formatClockTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRole(value: string | null | undefined) {
  if (!value) return "WRCAN member";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

function BioClockPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [gps, setGps] = useState<GeoFix | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const logsQuery = useQuery({
    queryKey: user?.id ? clockLogsKey(user.id) : ["bio-clock-logs", "signed-out"],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("clock_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("clocked_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refreshGps = useCallback(async () => {
    setGps(null);
    setGpsError(null);
    setGpsLoading(true);
    try {
      const position = await readGpsPosition();
      setGps(position);
      return position;
    } catch (error) {
      const message = error instanceof Error ? error.message : "GPS could not be read.";
      setGpsError(message);
      return null;
    } finally {
      setGpsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshGps();
  }, [refreshGps]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`clock-log-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clock_logs", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries({ queryKey: clockLogsKey(user.id) }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [queryClient, user?.id]);

  const logs = logsQuery.data ?? [];
  const nextClockType: ClockType = logs[0]?.clock_type === "IN" ? "OUT" : "IN";
  const workerName = profile?.full_name?.trim() || "WRCAN Member";
  const workerRole = profile?.member_type ?? "member";
  const csvRows = useMemo(
    () => logs.map((log) => ({
      "Worker Name": log.worker_name || workerName,
      "Worker Role": formatRole(log.worker_role || workerRole),
      "Clock Type": log.clock_type,
      "Clocked At": log.clocked_at,
      Latitude: log.latitude,
      Longitude: log.longitude,
      "Venue Verified": log.venue_verified === true ? "Yes" : "No",
    })),
    [logs, workerName, workerRole],
  );

  const recordClockEvent = async () => {
    if (!user?.id || saving || !gps) return;
    setSaving(true);
    try {
      const position = await refreshGps();
      if (!position) return;

      const clockedAt = new Date().toISOString();
      const attendanceHash = await createAttendanceHash([
        user.id,
        nextClockType,
        clockedAt,
        formatCoordinate(position.latitude),
        formatCoordinate(position.longitude),
      ].join("|"));
      const insert = buildClockInsert({
        userId: user.id,
        clockType: nextClockType,
        clockedAt,
        latitude: position.latitude,
        longitude: position.longitude,
        workerName,
        workerRole,
        attendanceHash,
        ppeReady: null,
        livenessPromptCompleted: null,
      });
      const { error } = await supabase.from("clock_logs").insert(insert);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: clockLogsKey(user.id) });
      toast.success(nextClockType === "IN" ? "Clock-in recorded with GPS." : "Clock-out recorded with GPS.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your clock event could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="WRCAN Bio-Sync OS" subtitle="GPS attendance ledger" theme="bio">
      <div className="space-y-5 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-bio-muted">Clock-In / Clock-Out</p>
            <h2 className="mt-1 text-xl font-semibold text-bio-copy">Shift checkpoint</h2>
          </div>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-bio-gold/40 bg-bio-gold/10 px-3 text-xs font-semibold uppercase text-bio-gold">
            <ShieldCheck className="h-4 w-4" /> GPS only
          </span>
        </div>

        <section className="rounded-md border border-bio-gold/30 bg-bio-slate-raised p-4 shadow-lg shadow-bio-slate/40 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-bio-sapphire text-bio-sapphire-foreground">
              {gpsLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-bio-copy">Current location</p>
              <p className="text-xs text-bio-muted">
                {gpsLoading ? "Getting a fresh GPS fix…" : gps ? "GPS fix ready" : "Location unavailable"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 border-bio-gold/50 bg-transparent px-3 text-bio-gold hover:bg-bio-gold/10 hover:text-bio-gold"
              onClick={() => void refreshGps()}
              disabled={gpsLoading || saving}
              aria-label="Refresh GPS location"
            >
              <RefreshCw className={`h-4 w-4 ${gpsLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh GPS</span>
            </Button>
          </div>

          {gps ? (
            <div className="mt-4 grid gap-3 border-t border-bio-muted/20 pt-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-bio-muted">Latitude</p>
                <p className="mt-1 font-mono text-bio-copy">{formatCoordinate(gps.latitude)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-bio-muted">Longitude</p>
                <p className="mt-1 font-mono text-bio-copy">{formatCoordinate(gps.longitude)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-bio-muted">
                <Navigation className="h-4 w-4 text-bio-gold" />
                Accuracy ±{Math.round(gps.accuracy)} m
              </div>
              <a
                href={mapUrl(gps.latitude, gps.longitude)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-bio-gold underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Open map
              </a>
            </div>
          ) : null}

          {gpsError ? (
            <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-bio-copy" role="alert">
              {gpsError}
            </p>
          ) : null}

          <div className="mt-4 border-t border-bio-muted/20 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-bio-muted">Next entry</p>
                <p className="mt-1 text-sm font-semibold text-bio-copy">
                  {workerName} · {formatRole(workerRole)}
                </p>
              </div>
              <span className="text-xs tabular-nums text-bio-muted">
                {new Intl.DateTimeFormat("en-ZA", { timeStyle: "short" }).format(new Date())}
              </span>
            </div>
            <Button
              type="button"
              className="min-h-12 w-full bg-bio-gold font-semibold text-bio-gold-foreground hover:bg-bio-gold/90"
              onClick={() => void recordClockEvent()}
              disabled={!gps || gpsLoading || saving || logsQuery.isLoading}
            >
              {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Clock3 className="h-5 w-5" />}
              {saving ? "Recording GPS…" : `Clock ${nextClockType === "IN" ? "In" : "Out"}`}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-bio-muted">
              Face images and health readings are not collected. GPS records are not verified against an approved venue.
            </p>
          </div>
        </section>

        <section aria-labelledby="clock-history-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-bio-gold" />
              <h2 id="clock-history-title" className="text-lg font-semibold text-bio-copy">Shift ledger</h2>
              <span className="text-xs text-bio-muted">{logs.length}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-bio-gold/40 bg-transparent text-bio-gold hover:bg-bio-gold/10 hover:text-bio-gold"
              onClick={() => downloadCsv("wrcan-clock-ledger.csv", csvRows)}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {logsQuery.isLoading ? (
            <p className="flex items-center gap-2 py-5 text-sm text-bio-muted" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your attendance history…
            </p>
          ) : logsQuery.isError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-bio-copy" role="alert">
              Your clock history could not be loaded. Try refreshing the page.
            </p>
          ) : logs.length === 0 ? (
            <div className="rounded-md border border-bio-muted/20 bg-bio-slate-raised/70 p-5 text-center">
              <MapPin className="mx-auto h-6 w-6 text-bio-gold" />
              <p className="mt-2 text-sm font-medium text-bio-copy">No clock entries yet</p>
              <p className="mt-1 text-xs text-bio-muted">Your saved clock events will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-bio-muted/20">
              {logs.map((log: ClockLog) => (
                <article key={log.id} className="flex flex-wrap items-center gap-3 py-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${log.clock_type === "IN" ? "bg-bio-sapphire text-bio-sapphire-foreground" : "bg-bio-gold/15 text-bio-gold"}`}>
                    {log.clock_type === "IN" ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-bio-copy">Clock {log.clock_type === "IN" ? "In" : "Out"}</p>
                    <p className="mt-0.5 text-xs text-bio-muted">
                      {log.worker_name || workerName} · {formatRole(log.worker_role || workerRole)}
                    </p>
                    <p className="mt-1 text-xs text-bio-muted">{formatClockTime(log.clocked_at)}</p>
                  </div>
                  <a
                    href={mapUrl(log.latitude, log.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-bio-gold hover:bg-bio-gold/10"
                    aria-label={`Open map for clock ${log.clock_type.toLowerCase()} location`}
                  >
                    <MapPin className="h-4 w-4" />
                    {formatCoordinate(log.latitude)}, {formatCoordinate(log.longitude)}
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}