import type { Database } from "@/integrations/supabase/types";

type ClockType = "IN" | "OUT";

export type ClockInsertInput = {
  userId: string;
  clockType: ClockType;
  clockedAt: string;
  latitude: number;
  longitude: number;
  workerName: string;
  workerRole: string;
  attendanceHash: string;
  ppeReady: boolean | null;
  livenessPromptCompleted: boolean | null;
};

export const CLOCK_IMAGE_NOT_STORED = "not-collected";
export const CLOCK_LOCATION_UNVERIFIED = "GPS captured only — venue not verified";

export function buildClockInsert(input: ClockInsertInput): Database["public"]["Tables"]["clock_logs"]["Insert"] {
  return {
    user_id: input.userId,
    clock_type: input.clockType,
    clocked_at: input.clockedAt,
    snapshot_path: CLOCK_IMAGE_NOT_STORED,
    latitude: input.latitude,
    longitude: input.longitude,
    venue_label: CLOCK_LOCATION_UNVERIFIED,
    pulse_bpm_estimate: null,
    attendance_hash: input.attendanceHash,
    ppe_ready: input.ppeReady,
    liveness_prompt_completed: input.livenessPromptCompleted,
    venue_verified: false,
    worker_name: input.workerName,
    worker_role: input.workerRole,
  };
}

export async function createAttendanceHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}