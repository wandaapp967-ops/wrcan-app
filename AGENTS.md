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
