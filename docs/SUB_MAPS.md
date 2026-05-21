# Sub-maps design specification

This document records product and technical decisions for **sub-maps**: user-created,
community-governed collections of pins with optional visibility on the world map.

Related: [SPEC.md](../SPEC.md) (world map behavior), brainstorm plan (not edited in-repo).

---

## 1. MVP scope (Tier 1 in, Tier 2/3 deferred)

### In MVP (v1)

| Feature | Notes |
|---------|--------|
| Create / list / view sub-map | Community URL, name, description, rules markdown |
| Sub-map map view | `/m/:community_url/map` — scoped pins, same React map shell as world |
| Roles | `owner`, `moderator`, `member` on `sub_map_memberships` |
| Contribution modes | Per sub-map: `open`, `members_only`, `approval_required` |
| Pin approval queue | Status `pending` → mod approves → `approved` |
| World promotion | Sub-map default `never \| ask \| always` + per-pin `visible_on_world_map` |
| Join / leave | Public sub-maps; `private` deferred (see below) |
| Scoped realtime | Channel `map:submap:<community_url>` |
| Scoped reports | Reports include `sub_map_id`; mod queue at `/m/:community_url/admin` |
| Light activity feed | Reuse `admin_activity_events` pattern with `sub_map_id` |
| Discovery | `/m` browse + search by name or community URL; public + `unlisted` only |

### Explicitly deferred (post-MVP)

**Tier 2:** pin suggestions (nominate without joining), comments per pin, per-community contributor tab on user profile, mod announcements banner, follow-without-joining, embed widget.

**Tier 3:** reviews/ratings, photo galleries, meetup events, polls, cross-sub-map linking, reputation scores.

**v1 exclusions (decided):**

- **Private / invite-only sub-maps** — defer; MVP supports `public` and `unlisted` (link-only, hidden from browse).
- **Multi-sub-map membership for one pin** — defer; v1 uses single `sub_map_id` on pin (see data model).
- **Per-sub-map pin colors** — defer; keep global `pin_type_colors`.
- **“Map Garden” migration sub-map** — existing pins remain `sub_map_id: NULL` (world-legacy); no bulk migration in v1.

### Global admin overlap (decided)

| Actor | World pins (`sub_map_id` NULL) | Sub-map pins |
|-------|-------------------------------|--------------|
| Pin owner | Edit/delete own | Edit/delete own (if approved or pending own) |
| Sub-map owner/mod | — | Full mod on pins in that sub-map |
| Site `admin_level >= 1` (pin moderator) | Yes (unchanged) | Yes — supersede for safety/abuse |
| Site `admin_level >= 10` | Catalog + admin UI | Same |

Sub-map mods do **not** gain world-map powers unless they are also site admins.

---

## 2. Data model

### Decision: single `sub_map_id` on `pins` (v1)

**Rationale:** Simpler queries, authorization, and realtime (one channel per sub-map). Most communities own a pin outright; cross-listing the same place in “BBQ Austin” and “Date night” is a Tier 3 concern (`pin_sub_maps` join table).

**Future:** Add `pin_sub_maps` when cross-sub-map linking ships without duplicating coordinates.

### Tables

#### `sub_maps`

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | PK |
| `community_url` | string | Unique, URL-safe path segment (`bbq-austin` → `/m/bbq-austin`) |
| `name` | string | Display name |
| `description` | text | Optional; markdown |
| `rules` | text | Optional; community rules markdown |
| `owner_user_id` | FK users | Creator; immutable first owner |
| `contribution_mode` | string | `open`, `members_only`, `approval_required` |
| `promote_to_world_default` | string | `never`, `ask`, `always` |
| `visibility` | string | `public`, `unlisted` (`private` later) |
| `bounds` | jsonb | Optional `{min_lat, max_lat, min_lng, max_lng}` |
| `settings` | jsonb | See settings schema below |
| timestamps | | |

**`settings` jsonb (v1 keys):**

```json
{
  "allowed_pin_types": ["other", "scheduled"],
  "required_tags": ["bbq"],
  "suggested_tags": ["bbq:trailer"],
  "require_description": true,
  "bounds_enforcement": "warn"
}
```

`bounds_enforcement`: `off` | `warn` | `block`.

#### `sub_map_memberships`

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | PK |
| `sub_map_id` | FK | |
| `user_id` | FK | Unique per `(sub_map_id, user_id)` |
| `role` | string | `owner`, `moderator`, `member` |
| `status` | string | `active`, `pending`, `banned` |
| timestamps | | |

Owner row created on sub-map create. Additional moderators promoted by owner.

#### `pins` (additions)

| Column | Type | Description |
|--------|------|-------------|
| `sub_map_id` | FK nullable | `NULL` = legacy world-only pin |
| `status` | string | `pending`, `approved`, `rejected`, `archived` |
| `visible_on_world_map` | boolean | Default from sub-map on create; user may override if policy allows |

**World map query:** `sub_map_id IS NULL OR visible_on_world_map = true` AND `status = 'approved'`.

**Sub-map map query:** `sub_map_id = ?` AND (`status = 'approved'` OR viewer is mod seeing pending).

Legacy pins: `sub_map_id` NULL, `status` effectively `approved`, `visible_on_world_map` true.

#### `content_reports` (addition)

| Column | Type | Description |
|--------|------|-------------|
| `sub_map_id` | FK nullable | Set when report concerns a sub-map pin |

#### Activity events (addition)

| Column | Type | Description |
|--------|------|-------------|
| `sub_map_id` | FK nullable | Scope feed to community |

### Tags (v1)

Sub-map **required/suggested tags** are enforced via `settings`; tag rows remain global but names may use a prefix convention (`bbq:smokehouse`) documented in rules. Dedicated `sub_map_tags` table deferred.

---

## 3. Policy matrix

### Contribution mode × action

| Action | `open` | `members_only` | `approval_required` |
|--------|--------|------------------|---------------------|
| View approved pins | Everyone | Everyone | Everyone |
| View pending pins | Mods | Mods | Mods + submitter (own pending) |
| Join community | Optional^ | Required to post | Optional^ |
| Create pin | Any logged-in | Members `active` | Any logged-in → `pending` |
| Edit own pin | Owner; mod | Owner; mod | Owner while `pending`; mod always |
| Delete own pin | Owner; mod | Owner; mod | Owner; mod |
| Approve/reject pin | Mod | Mod | Mod |
| Promote to world | Per promotion policy | Per promotion policy | Per promotion policy |

^Join tracked for member count; not required to view in `open` mode.

### World promotion policy

| `promote_to_world_default` | On create | User override |
|----------------------------|-----------|---------------|
| `never` | `visible_on_world_map = false` | Forbidden |
| `ask` | `false`; UI checkbox default off | Owner/mod may toggle on edit if sub-map allows |
| `always` | `true` | Mod may demote; owner edit per rules |

Per-pin override only when sub-map default is `ask` or `always` (never blocks demotion for mods).

### Role permissions

| Permission | `member` | `moderator` | `owner` | Site admin ≥1 |
|------------|----------|-------------|---------|---------------|
| View sub-map | Yes | Yes | Yes | Yes |
| Post pin (per contribution mode) | If allowed | Yes | Yes | Yes |
| Edit any pin in sub-map | No | Yes | Yes | Yes |
| Delete any pin in sub-map | No | Yes | Yes | Yes |
| Approve/reject pins | No | Yes | Yes | Yes |
| Manage memberships | No | Yes | Yes | Yes |
| Add/remove moderators | No | No | Yes | Yes |
| Edit sub-map settings | No | No | Yes | Yes |
| Transfer ownership | No | No | Yes (future) | Yes |
| Ban member (`status: banned`) | No | Yes | Yes | Yes |
| Resolve sub-map reports | No | Yes | Yes | Yes |

Muted users (`users.muted_at`): cannot create or update pins anywhere (existing rule).

Sub-map **banned** users: cannot post in that sub-map only.

### Pin `status` transitions

```
pending --approve--> approved
pending --reject--> rejected
approved --archive--> archived (mod/owner)
rejected --(no public visibility)
```

New pin in `open` or `members_only` without approval mode: `approved` immediately.

### Content rules enforcement (on create/update)

1. `allowed_pin_types` — changeset validation
2. `required_tags` — at least one tag matching each required name
3. `require_description` — non-empty description
4. `bounds` + `bounds_enforcement` — geo check on lat/lng

---

## 4. Discovery & routes

### URL structure

| Route | Purpose | Auth |
|-------|---------|------|
| `GET /m` | Browse/search public sub-maps | Optional |
| `GET /m/new` | Create sub-map wizard | Required |
| `GET /m/design` | Sub-maps design summary (public) | Optional |
| `GET /m/:community_url` | Community home (rules, stats, CTAs) | Optional |
| `GET /m/:community_url/map` | Map UI (React, scoped pins) | Optional |
| `GET /m/:community_url/admin` | Mod queue, reports, members | Required + mod role |
| `GET /map` | World map (unchanged) | Optional |

**Community URL** (user-facing term for the path segment): lowercase alphanumeric + hyphens, 3–48 chars, unique. Example: `bbq-austin` → `https://…/m/bbq-austin`.

### API (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sub_maps` | List public (+ unlisted if community URL known); query `q` search |
| GET | `/api/sub_maps/:community_url` | Sub-map metadata + viewer membership |
| POST | `/api/sub_maps` | Create (auth) |
| PATCH | `/api/sub_maps/:community_url` | Update settings (owner) |
| GET | `/api/sub_maps/:community_url/pins` | Scoped pin list |
| POST | `/api/sub_maps/:community_url/memberships` | Join |
| DELETE | `/api/sub_maps/:community_url/memberships/me` | Leave |
| POST | `/api/sub_maps/:community_url/pins/:id/approve` | Mod approve |
| POST | `/api/sub_maps/:community_url/pins/:id/reject` | Mod reject |

Pin writes include `sub_map_id` (or nested under sub_map route); world writes remain `POST /api/pins` with `sub_map_id` absent.

### Browse UX (`/m`)

- Search input filters by name or community URL (server-side `ilike`).
- Cards: name, tagline/description excerpt, pin count, member count, region hint from bounds.
- Sort: `newest`, `most_pins`, `most_members` (MVP: `newest` + `most_pins`).
- Empty state: CTA to create first sub-map (if authenticated).
- `unlisted` sub-maps: excluded from index; accessible via direct link.

### Sub-map home (`/m/:community_url`)

- Header: name, description, rules
- Stats row: pins, members, contribution mode badge
- Primary CTA: “Open map” → `/m/:community_url/map`
- Secondary: Join / Leave (if authenticated)
- Mods: link to admin queue when pending count > 0

### Map chrome (`/m/:community_url/map`)

- `data-community-url` on `#react-root` for client to fetch scoped pins + channel
- Breadcrumb: Communities → {name} → Map
- Pin form: respect promotion checkbox when `ask`
- World map `/map`: optional layer filter for promoted sub-map pins (phase 1b); MVP may only show legacy + promoted pins in existing feed

### Realtime

- World: `map:world` (unchanged)
- Sub-map: `map:submap:<community_url>` — join when viewing `/m/:community_url/map`
- Broadcast pin events to sub-map topic always; to `map:world` only if `visible_on_world_map`

---

## 5. Implementation phases (after this doc)

1. Migrations + `Storymap.SubMaps` context + `Storymap.SubMaps.Policy`
2. API + Pin changeset integration
3. LiveViews: Index, Show, Admin; MapController `sub_map` action
4. React: read `data-community-url`, scoped API, channel subscribe
5. Reports + activity scoped fields
6. Tests per AGENTS.md patterns

---

## 6. Example communities

**BBQ Restaurants (Austin)** — `members_only`, `approval_required` for first 50 pins, `allowed_pin_types: [other]`, `required_tags: [bbq]`, bbox Austin metro, `promote_to_world: ask`.

**Regional food banks** — `open`, `allowed_pin_types: [food_bank, scheduled]`, `promote_to_world: always`, strict hours validation.
