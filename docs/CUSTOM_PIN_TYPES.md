# Pin types

Unified global catalog of pin templates (system seeds + user-defined). See also [SUB_MAPS.md](SUB_MAPS.md).

## Overview

- **Catalog:** `pin_types` table (global, not per-community)
- **Pin identity:** required `pins.pin_type_id` FK; wire JSON exposes `pin_type` as the catalog **slug** (no prefixes) plus `pin_type_id`
- **Schema values:** `pins.custom_data` (jsonb map keyed by schema field `key`)
- **Per-pin extras:** `pins.ad_hoc_fields` (jsonb ordered list of `{id, label, type, options?, value?}`) — not stored inside `custom_data`
- **Schedule:** `time_mode` and `allow_open_24_7` on the type; times live on pin columns (`start_time`, `end_time`, `schedule_rrule`, `schedule_timezone`)
- **System types:** seeded rows with `is_system: true` (`one_time`, `scheduled`, `food_bank`, `other`) — non-deletable; labels/colors from `assets/shared/pin_type_colors.json`

## System types

| slug | `time_mode` | `allow_open_24_7` | icon |
|------|-------------|-------------------|------|
| `one_time` | `one_time` | false | `carrot` |
| `scheduled` | `hours` | false | `calendar` |
| `food_bank` | `hours` | true | `building` |
| `other` | `none` | false | `star` |

Empty schema (`{"fields":[]}`); schedule UI is driven entirely by `time_mode` / `allow_open_24_7`.

## Time mode

| `time_mode` | Pin form | Notes |
|-------------|----------|--------|
| `none` (default) | No schedule UI | Schedule columns cleared on save |
| `one_time` | Datetime start/end | Absolute start/end |
| `hours` | Time-only + RRULE | Optional Open 24/7 when `allow_open_24_7` is true |

Changing `time_mode` on a type does not rewrite existing pins until each pin is saved again.

## Who can do what

| Action | Who |
|--------|-----|
| Create a type | Any logged-in user (`/pin-types/new`, `POST /api/pin_types`) |
| Edit/delete a type | Creator or site admin (`admin_level >= 1`); system types cannot be deleted |
| Use on world map | Any user who can post pins — all **enabled** catalog types |
| Enable types in a community | Community owner/mod (`/m/:url/settings`) via `sub_map_pin_types` |

## Community allowlist

Stored in the `sub_map_pin_types` join table (`sub_map_id`, `pin_type_id`), not in `sub_maps.settings`.

- World map: all enabled catalog types (no join rows)
- Community create: empty allowlist by default (or whatever the create form selects)
- API: sub-map JSON includes `enabled_pin_types` (full schemas) and `enabled_pin_type_ids`

Obsolete settings keys (`enabled_builtin_pin_types`, `enabled_custom_pin_types`, `allowed_pin_types`) are migrated into the join table then stripped.

## Field schema (v1)

Supported field types: `text`, `textarea`, `number`, `boolean`, `select`, `url`, `list` (of text), `music`, `drawing`. See [MUSIC_FIELDS.md](MUSIC_FIELDS.md) for blob storage.

```json
{
  "fields": [
    { "key": "machine_status", "type": "select", "label": "Status", "required": true,
      "options": [{"value": "working", "label": "Working"}] }
  ]
}
```

## Ad-hoc fields

Per-pin author-defined fields in `pins.ad_hoc_fields`:

```json
[
  { "id": "note_1", "label": "Tip", "type": "text", "value": "Bring cash" },
  { "id": "sketch", "label": "Sketch", "type": "drawing", "value": { "ref": 42 } }
]
```

Blob fields resolve `field_key` against the type schema **or** an ad-hoc field `id`; refs are written into `custom_data[key]` or the ad-hoc entry's `value`.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/pin_types` | Public list of enabled types |
| POST | `/api/pin_types` | Auth required |
| PATCH | `/api/pin_types/:id` | Creator or admin |
| PATCH | `/api/sub_maps/:url/pin_type_settings` | Mod+ allowlist (`enabled_pin_type_ids`) |

Pin create/update accepts `pin_type` (slug) and/or `pin_type_id`, plus `custom_data` and `ad_hoc_fields`.

## UI routes

- `/pin-types` — browse catalog (public)
- `/pin-types/new`, `/pin-types/:id/edit` — create/edit (auth); delete hidden for system types
- `/m/:community_url/settings` — community settings including pin type allowlist (owner)

## Unify migration (string → FK)

When moving from the dual builtin/`custom:<slug>` model:

1. Catalog table renamed `custom_pin_types` → `pin_types`; system rows inserted
2. Pins: `custom:<slug>` → `pin_type_id` for matching slug; bare builtin slug → system row
3. Migration **raises** if any pin cannot be resolved (no silent orphans)
4. Community allowlists copied from settings JSON into `sub_map_pin_types`, then obsolete keys removed

## Schema changes

- Adding fields: existing pins omit new keys
- Removing fields: orphaned keys remain in DB but are hidden; stripped on save
- Deleting a type: blocked while pins reference it or when `is_system`; use `enabled: false` instead
