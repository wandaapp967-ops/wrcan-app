import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { MatchRing, Plate, RoseButton } from "@/components/EmpireUI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { matchModule } from "@/lib/matching";

export const Route = createFileRoute("/training/$moduleId")({
  head: () => ({
    meta: [
      { title: "Training Module — WRCAN App" },
      {
        name: "description",
        content:
          "Enrol in an accredited WRCAN training module, track your progress and download your certificate on completion.",
      },
      { property: "og:title", content: "Training Module — WRCAN App" },
      {
        property: "og:description",
        content: "Enrol, learn and earn an accredited certificate on WRCAN.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Shell title="Module unavailable">
      <p className="text-center text-sm text-muted-foreground">
        We couldn't load this module. Please try again.
      </p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell title="Module not found">
      <p className="text-center text-sm text-muted-foreground">This module no longer exists.</p>
    </Shell>
  ),
  component: ModulePage,
});

function certNumber() {
  return `WRCAN-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function ModulePage() {
  const { moduleId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: mod } = useQuery({
    queryKey: ["training_module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", moduleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", moduleId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!mod) {
    return (
      <Shell title="Training">
        <p className="text-center text-sm text-muted-foreground">Loading module…</p>
      </Shell>
    );
  }

  const match = matchModule(profile, mod);

  const enrol = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, module_id: mod.id, status: "in_progress", progress: 10 });
    setBusy(false);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["enrollment", moduleId, user.id] });
    toast.success("Enrolled. Your journey begins.");
  };

  const advance = async (progress: number) => {
    if (!user || !enrollment) return;
    setBusy(true);
    const done = progress >= 100;
    const score = done ? 78 + Math.floor(Math.random() * 20) : null;
    const { error } = await supabase
      .from("enrollments")
      .update({
        progress,
        status: done ? "completed" : "in_progress",
        completed_at: done ? new Date().toISOString() : null,
        score,
      })
      .eq("id", enrollment.id);

    if (!error && done) {
      await supabase.from("certificates").insert({
        user_id: user.id,
        module_id: mod.id,
        certificate_number: certNumber(),
        learner_name: profile?.full_name || user.email || "WRCAN Learner",
        module_title: mod.title,
        provider: mod.provider,
        score,
      });
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["enrollment", moduleId, user.id] });
    if (done) {
      toast.success("Module complete — certificate issued.");
      void navigate({ to: "/certificates" });
    } else {
      toast.success("Progress saved.");
    }
  };

  return (
    <Shell title={mod.title} subtitle={mod.provider}>
      <div className="space-y-4 pb-6">
        <Plate className="flex items-start gap-3">
          <MatchRing score={match.score} />
          <div>
            <p className="text-xs text-muted-foreground">
              {mod.accrediting_body ? `${mod.accrediting_body} · ` : ""}
              {mod.nqf_level ? `NQF ${mod.nqf_level} · ` : ""}
              {mod.duration_hours}h{mod.credits ? ` · ${mod.credits} credits` : ""}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-foreground">
              {match.reasons.map((r) => (
                <li key={r}>✓ {r}</li>
              ))}
              {match.blockers.map((b) => (
                <li key={b} className="text-muted-foreground">
                  • {b}
                </li>
              ))}
            </ul>
          </div>
        </Plate>

        <Plate>
          <h2 className="font-display mb-2 text-lg font-semibold">About this module</h2>
          <p className="text-sm text-muted-foreground">{mod.description}</p>
          {(mod.tags ?? []).length ? (
            <p className="mt-3 flex flex-wrap gap-2">
              {mod.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-primary/40 px-3 py-1 text-[0.6rem] tracking-widest text-primary uppercase"
                >
                  {t}
                </span>
              ))}
            </p>
          ) : null}
          {mod.manual_url ? (
            <a
              href={mod.manual_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs tracking-widest text-primary uppercase underline"
            >
              Open training manual
            </a>
          ) : null}
        </Plate>

        <Plate className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Your progress</h2>
          {!enrollment ? (
            <RoseButton onClick={enrol} disabled={busy} className="w-full">
              {user ? "Enrol now" : "Sign in to enrol"}
            </RoseButton>
          ) : (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="rose-metal h-full"
                  style={{ width: `${enrollment.progress}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                {enrollment.progress}% · {enrollment.status.replace("_", " ")}
              </p>
              {enrollment.status !== "completed" ? (
                <div className="flex gap-2">
                  <RoseButton
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => advance(Math.min(90, enrollment.progress + 30))}
                  >
                    Continue
                  </RoseButton>
                  <RoseButton className="flex-1" disabled={busy} onClick={() => advance(100)}>
                    Complete & certify
                  </RoseButton>
                </div>
              ) : (
                <RoseButton className="w-full" onClick={() => void navigate({ to: "/certificates" })}>
                  View certificate
                </RoseButton>
              )}
            </>
          )}
        </Plate>
      </div>
    </Shell>
  );
}
