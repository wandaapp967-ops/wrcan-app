import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, CircleDot, Film, Home, MessageCircle, User, Briefcase } from "lucide-react";
import type { ReactNode } from "react";
import { useUnreadCount, useControlAccess } from "@/hooks/useBadges";
import logoAsset from "@/assets/wanda-logo.png.asset.json";

const NAV = [
  { to: "/", label: "Empire", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/reels", label: "Reels", icon: Film },
  { to: "/status", label: "Status", icon: CircleDot },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/control-room", label: "Control", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
];



export function Shell({
  children,
  title,
  subtitle,
  bare = false,
  theme = "default",
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  bare?: boolean;
  theme?: "default" | "bio";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadCount();
  const { allowed: canControl } = useControlAccess();
  const nav = NAV.filter((n) => n.to !== "/control-room" || canControl);
  const bioTheme = theme === "bio";

  return (
    <div className={`relative min-h-screen ${bioTheme ? "bg-bio-slate text-bio-copy" : "gold-pattern"}`}>
      <div className={`absolute inset-0 ${bioTheme ? "bg-bio-slate/75" : "bg-background/40"}`} aria-hidden />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col">
        {!bare && (
          <header className="px-5 pt-6 pb-3 text-center">
            <Link to="/" className="inline-block">
              <img src={logoAsset.url} alt="Wanda Recruitment and Catering Agency" className="mx-auto h-20 w-auto" />
            </Link>

            {title ? (
              <>
                <h1 className={`mt-3 font-display text-2xl font-semibold tracking-wide uppercase ${bioTheme ? "text-bio-gold" : "rose-text"}`}>
                  {title}
                </h1>
                <div className="deco-rule mx-auto mt-2 w-40" />
              </>
            ) : null}
            {subtitle ? (
              <p className={`mt-2 text-xs tracking-widest uppercase ${bioTheme ? "text-bio-muted" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            ) : null}
          </header>
        )}

        <main className={bare ? "flex-1" : "flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]"}>{children}</main>

        {!bare && (
          <nav
            aria-label="Main navigation"
            className={`fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-2xl overflow-x-auto overscroll-x-contain px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${bioTheme ? "border-t border-bio-gold/30 bg-bio-slate/95" : "glass-plate"}`}
          >
            <div className="flex min-w-max items-center">
              {nav.map(({ to, label, icon: Icon }) => {
                const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-label={label}
                    className={`flex min-h-11 w-[4.25rem] flex-none flex-col items-center justify-center gap-1 rounded-md px-1 py-1 transition-colors ${
                      active
                        ? bioTheme ? "text-bio-gold" : "text-primary"
                        : bioTheme ? "text-bio-muted hover:text-bio-copy" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
                      {to === "/chat" && unread > 0 ? (
                        <span className="balloon-red absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.55rem] font-bold">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[0.58rem] tracking-wide uppercase">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
