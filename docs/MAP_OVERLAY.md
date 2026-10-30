# Persistent map overlay

The React MapLibre map stays mounted in the root layout. Non-map LiveView
pages render as a sheet overlay instead of replacing the map. World ↔ garden
map switches `live_patch` inside `MapLive` so the WebGL context is not torn
down.

Phoenix `router.ex` and `~p` remain the source of truth for **navigation**.
Path **classification** and un-verified string builders live in twin modules
(GardenCopy-style):

- Elixir: `lib/storymap_web/map_paths.ex` (`StorymapWeb.MapPaths`)
- TypeScript: `assets/js/react/mapRoute.ts`

Keep those two files in sync. Do not introduce JSON or codegen.

Related: [SUB_MAPS.md](SUB_MAPS.md) (garden map routes).

---

## Layers

```
z-50  site header + mobile drawer
z-45  #content-overlay  (Layouts.app when overlay={true})
z-10  LiveView inner content wrapper (pointer-events-none except overlay)
z-0   #react-root MapLibre
```

`root.html.heex` always includes `#react-root`. `{@inner_content}` is the
LiveView. `MapLive` is the LiveView for `/`, `/map`, and `/g/:url/map`.

`Layouts.app` defaults to `overlay={true}` (sheet + dimmed backdrop).
`MapLive` is the only caller that passes `overlay={false}`: it renders a
sr-only `<main>` plus `#map-live-bridge` (`phx-hook="MapLive"`).

---

## How overlay open/close works

1. Navigate to a non-map LiveView (`live_redirect` / `<.link navigate>`).
2. `Layouts.app` mounts `#content-overlay` with `phx-hook="ContentOverlay"`.
3. The hook **acquires** document occupancy (`acquireContentOverlay` in
   `contentOverlay.ts`): `body.content-overlay-open`, `#react-root`
   `aria-hidden` + `pointer-events-none`, and `map:overlay-open` only if
   occupancy was previously zero.
4. CSS hides `[data-map-chrome]` and MapLibre controls while the overlay is
   open. The map canvas stays visible underneath the dimmer.
5. Close (X, Escape, backdrop) clicks `[data-back-to-map]`, whose `href` is
   the last map URL from `sessionStorage` (`LAST_MAP_PATH_KEY`).
6. Hook `destroyed` aborts Escape/backdrop listeners, then **releases**
   occupancy. Close commits on a microtask (and again on
   `phx:page-loading-stop` if the dying overlay node is still in the tree)
   only when no `[data-content-overlay]` remains. About→Help must not fire
   `map:overlay-close`. Overlay listeners use `AbortController`.

Root chrome (`nav`, footer, `#react-root` data attrs) lives **outside**
LiveView, so `@conn.request_path` is stale after client navigation.
`site_chrome.js` / `app.js` re-classify `window.location.pathname` on
`phx:page-loading-stop` and `map:route-change`.

---

## Path prefixes

| Constant | Value | Role |
|----------|-------|------|
| `ROOT_PATH` / `root/0` | `/` | World map (alias of `/map`) |
| `WORLD_MAP_PATH` / `world_map/0` | `/map` | Canonical world map |
| `GARDEN_PREFIX` / `garden_prefix/0` | `/g` | Canonical gardens |
| `LEGACY_GARDEN_PREFIX` / `legacy_garden_prefix/0` | `/m` | Classification only; HTTP 301 → `/g` |

Builders (`map_path/1`, `mapPathForScope`) always emit `/g`, never `/m`.
`community_url/1` reads the slug from `/g/:url/map` only.

A **map pathname** is `/`, `/map`, or `{/g|/m}/…/map`.
**Gardens nav** is current on `/g`, `/m`, and `{/g|/m}/…` except `…/map`.

---

## Invariants

Keep these. Overlay and pin-URL bugs come from breaking them.

1. **Do not remount `#react-root`.** One instance in the root layout. Never
   put a second React mount on overlay pages.

2. **Only `MapLive` sets `overlay={false}`.** Every other LiveView keeps the
   default overlay sheet. Begin templates with
   `<Layouts.app flash={@flash} current_scope={@current_scope}>`.

3. **`?pin=` only on map pathnames.** `isMapPathname` / `map_pathname?` must
   gate `history.replaceState` and `livePatch`. Never write pin query onto
   `/about`, `/users/settings`, etc.

4. **`livePatch` is a no-op off the map.** World ↔ garden stays inside
   `MapLive`. Overlay URLs must `live_redirect` (or a full navigate), not
   patch MapLive params.

5. **Do not change React map scope while an overlay is open.**
   `useMapScope` returns early when the URL is not a map path so LiveView
   and React stay aligned.

6. **Remember last map path only for map URLs.** Overlay close reads
   `sessionStorage` `mapgarden:lastMapPath`. Default `/` if missing.
   `?pin=` writes (`syncMapPinSearch`) must update last-map-path, not only
   `history.replaceState`.

7. **Re-classify in JS after LiveView nav.** Do not trust stale
   `@conn.request_path` on root chrome (`data-nav-*`, footer, page padding,
   `#react-root` community url after first paint).

8. **Overlay pointer-events:** the sheet wrapper is `pointer-events-none`;
   the card and `[data-overlay-backdrop]` are `pointer-events-auto`. Backdrop
   clicks must hit the backdrop node, not the wrapper.

9. **Mark map UI `data-map-chrome`.** Community toolbar, about sheet, legend,
   and similar controls hide under `body.content-overlay-open`. Keep the
   community toolbar **mounted** (CSS hides it); unmounting drops garden
   identity when the overlay closes.

10. **Clean overlay listeners.** `ContentOverlay` uses one `AbortController`
    per mount; abort on destroy (and before remount).

11. **Overlay occupancy is document-level, not hook lifetime.**
    `destroyed` must not drop `content-overlay-open` or dispatch
    `map:overlay-close` until no `[data-content-overlay]` remains
    (microtask, then `phx:page-loading-stop` if the dying node is still
    present). Overlay→overlay keeps chrome hidden. Keep hiding chrome
    under an overlay; do not leave map toolbar/search/filters visible
    under the sheet. `#react-root` inert (`aria-hidden`,
    `pointer-events-none`) is owned by occupancy, not by
    `site_chrome.js` querying `[data-content-overlay]`.

12. **Auth return paths stay allowlisted.** Login `user_return_to` must not
    use the LiveView websocket URI (`/live/...`). Prefer the LiveView’s
    `socket.view` + params (or an allowlisted `return_to` query).

13. **Same OTP app is OK; no cycle.** `Storymap.Pins.map_path_for_pin/1` may
    call `MapPaths`. `MapPaths` must not import `Pins` or other contexts.

14. **Change a prefix in three places:** `router.ex` (and `~p` call sites),
    `MapPaths`, `mapRoute.ts`. Classifiers/builders are not verified routes.

---

## Key files

| Piece | File |
|-------|------|
| Map host LiveView | `lib/storymap_web/live/map_live.ex` |
| Overlay sheet | `Layouts.app` in `lib/storymap_web/components/layouts.ex` |
| Persistent mount | `lib/storymap_web/components/layouts/root.html.heex` |
| Overlay hook | `assets/js/hooks/content_overlay.js` |
| Overlay occupancy | `assets/js/react/utils/contentOverlay.ts` |
| MapLive → React | `assets/js/hooks/map_live.js` (`map:set-scope`) |
| Chrome sync | `assets/js/site_chrome.js` |
| Scope + pin URLs | `assets/js/react/hooks/useMapScope.ts` |
| Patch vs redirect | `assets/js/react/utils/liveNav.ts` |
| Overlay CSS | `body.content-overlay-open` in `assets/css/app.css` |
