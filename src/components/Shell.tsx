import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase, GraduationCap, Home, MessageCircle, User } from "lucide-react";
import type { ReactNode } from "react";
import marble from "@/assets/marble-bg.jpg";
import logo from "@/assets/wrcan-logo.png";

const NAV = [
  { to: "/", label: "Empire", icon: Home },
  { to: "/training", label: "Training", icon: GraduationCap },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

export function Shell({
  children,
  title,
  subtitle,
  bare = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  bare?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      className="marble-page relative min-h-screen"
      style={{ backgroundImage: `url(${marble})` }}
    >
      <div className="absolute inset-0 bg-background/55" aria-hidden />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col">
        {!bare && (
          <header className="px-5 pt-6 pb-3 text-center">
            <Link to="/" className="inline-block">
              <img src={logo} alt="WRCAN Specialists" width={1152} height={576} className="mx-auto h-12 w-auto" />
            </Link>
            {title ? (
              <>
                <h1 className="font-display rose-text mt-3 text-2xl font-semibold tracking-wide uppercase">
                  {title}
                </h1>
                <div className="deco-rule mx-auto mt-2 w-40" />
              </>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-xs tracking-widest text-muted-foreground uppercase">
                {subtitle}
              </p>
            ) : null}
          </header>
        )}

        <main className={bare ? "flex-1" : "flex-1 px-4 pb-28"}>{children}</main>

        {!bare && (
          <nav className="glass-plate fixed right-0 bottom-0 left-0 z-40 mx-auto flex w-full max-w-2xl items-center justify-around px-2 py-2">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
                  <span className="text-[0.6rem] tracking-widest uppercase">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
