<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the media-studio practice local to the browser and embed shared live rooms through Jitsi; this allows immediate demo recordings without storing student video or operating a call server.
- Keep Media House Hub desk simulations and uploaded cover-art previews browser-local; this protects student practice media and keeps demonstrations instant.

## Running locally with Base44

`docker compose -f docker-compose.base44.yml up -d` starts the whole app on
<http://localhost:3000> (Vite dev server, live reload). There is no local
database: the repo's committed `.env` points at the project's hosted Supabase
(`shunfxazqsqpelgxfyqg.supabase.co`) and carries the **publishable** key, which is
a client-side key and safe to keep in the repo. That is why the app boots with no
credentials supplied by anyone — no secret is required to start it.

Non-obvious details worth remembering:

- **Package manager is Bun** (`bun.lock` + `bunfig.toml`, text lockfile v1). The
  compose service installs it with `bun install --frozen-lockfile` into a named
  volume so `node_modules` is never bind-mounted from the host. Run installs from
  the repo root; do not mix in `npm install`, which has no lockfile here.
- **`SUPABASE_SERVICE_ROLE_KEY` is not required to boot.** Only
  `src/integrations/supabase/client.server.ts` reads it, and nothing imports that
  module, so the missing value simply never gets evaluated. Add it as a Base44
  secret if a server-side admin task is ever wired up.
- **The `wanda-logo.png` asset is not in the repo.** `src/assets/wanda-logo.png.asset.json`
  points at `/__l5e/assets-v1/...`, which `@lovable.dev/vite-tanstack-config`
  proxies to `LOVABLE_PREVIEW_HOST` — but the plugin is a no-op when that variable
  is unset, so the logo 404s. Compose sets `LOVABLE_PREVIEW_HOST=wrcan-app.lovable.app`
  (the project's published host) purely so the existing plugin can resolve it.
  Nothing in the app code is overridden for this.
- **Host allowlisting** is handled by the platform-supplied
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` (a `.<sandbox domain>` wildcard) passed
  through compose, so no `vite.config.ts` change was needed. Note Vite validates
  `Host` on the HMR WebSocket upgrade too, and a browser HMR socket also carries a
  per-server token — a hand-rolled `new WebSocket(...)` probe without that token is
  always rejected, so don't read that as a broken edit loop. Check the dev server
  log for `[vite] (client) hmr update <file>` instead: that line proves the browser
  client is connected.
- **Known console noise:** React reports a hydration mismatch on first load
  (client tree is regenerated, the app still renders). It is pre-existing app
  behaviour, unrelated to this environment.
- Verify a boot with `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
  (expect 200) and by checking `docker compose -f docker-compose.base44.yml ps`
  shows the `web` service healthy. A live dev server serves unhashed `/src/...`
  module URLs and `data-tsd-source` attributes — if you see hashed bundles instead,
  the compose file is running a production build and needs fixing.

## Real-time map

Everything on the live surfaces is driven by Supabase (`shunfxazqsqpelgxfyqg`) rather than by
polling — if a surface looks stale, the channel is the first thing to check, not the timer.

- **Jobs** — `jobs.tsx` subscribes to `postgres_changes` on `jobs`; `/jobs/$jobId` subscribes on
  `applications` (filtered by `job_id`) so an application status change appears without a refresh.
  `LiveJobsFeed` aggregates three public job APIs (Remotive, Jobicy, Arbeitnow): that source is
  pull-only, so it re-fetches every 60 s and shows a ticking "Updated Ns ago" label instead.
- **Donors** — one `donations-live` channel invalidates `["donations"]` on any `donations` change
  (and toasts new pledges from other people) plus `["donation_campaigns"]`.
- **Notifications** — `NotificationBalloons` listens to `messages` INSERTs; `useUnreadCount` also
  subscribes to `messages` + `conversation_participants` so the nav badge moves instantly.
- **Control room** — one channel over `messages`, `profiles`, `talent_reels`, `applications`,
  `certificates`, `enrollments`, `status_posts` invalidates `["control-room-stats"]`.
- **Presence** — `PresenceProvider` (`usePresence`) is one app-wide channel and now broadcasts the
  member's display name, so `onlineMembers` gives names as well as ids. `useRoomPresence(roomCode)`
  is a separate presence channel per Media Studio room code; it is presence only — no media and
  nothing persisted, which keeps the "studio practice stays browser-local" rule intact.
- Do not reintroduce `refetchInterval` polling on these surfaces; it was removed deliberately.

Live-looking UI: `src/lib/live-time.ts` exports `timeAgo()` and `useTick()` (a 5 s re-render timer)
and `src/components/LiveBadge.tsx` exports `LivePulse`. Relative timestamps must be paired with
`useTick()` or they freeze at the render value.

Navigation smoothing: `src/router.tsx` sets `defaultPendingComponent` (`RoutePending`) and pending
timings, and the two job routes declare `loader`s that `prefetchQuery` into the React Query cache —
combined with `defaultPreload: "intent"` that is what makes hovering a link then opening it instant.
`src/components/Skeleton.tsx` provides the plate-shaped loaders used while a list first loads.
