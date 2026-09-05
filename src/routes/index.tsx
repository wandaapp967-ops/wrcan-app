import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Briefcase,
  GraduationCap,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react";
import { Medallion } from "@/components/Medallion";
import { Shell } from "@/components/Shell";
import { RoseButton } from "@/components/EmpireUI";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WRCAN App — Training, Jobs & Certificates in South Africa" },
      {
        name: "description",
        content:
          "WRCAN connects students, job seekers, recruiters and catering companies with accredited training, auto-matched vacancies and real-time chat.",
      },
      { property: "og:title", content: "WRCAN App — Build an Empire" },
      {
        property: "og:description",
        content:
          "Accredited training modules, downloadable certificates, auto-matched jobs and WhatsApp-style chat, all in one South African platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TILES = [
  { to: "/training", label: "Training", icon: GraduationCap, caption: "YES · SETA · UNICEF" },
  { to: "/jobs", label: "Jobs", icon: Briefcase, caption: "Auto-matched" },
  { to: "/reels", label: "Talent Reels", icon: Film, caption: "Show your skills" },
  { to: "/status", label: "Status", icon: CircleDot, caption: "24-hour updates" },
  { to: "/certificates", label: "Certificates", icon: Award, caption: "Download" },
  { to: "/chat", label: "Chat", icon: MessageCircle, caption: "Groups & direct" },
  { to: "/profile", label: "My Profile", icon: UserRound, caption: "Registration" },
  { to: "/jobs", label: "Recruiters", icon: Users, caption: "Post vacancies" },
];


function Index() {
  const { user, profile, loading } = useAuth();

  return (
    <Shell title="Build an Empire" subtitle="WRCAN Specialists">
      {!loading && !user ? (
        <div className="mb-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Sign in to unlock training, certificates, matching and chat.
          </p>
          <Link to="/auth">
            <RoseButton>Sign in to your empire</RoseButton>
          </Link>
        </div>
      ) : null}

      {profile ? (
        <p className="mb-5 text-center text-xs tracking-widest text-muted-foreground uppercase">
          Welcome, {profile.full_name || "Member"} · {profile.member_type}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-6">
        {TILES.map((t) => (
          <Medallion key={t.label} {...t} />
        ))}
      </div>
    </Shell>
  );
}
