# Custom pin types

Global, user-defined pin templates with flexible field schemas. See also [SUB_MAPS.md](SUB_MAPS.md).

## Overview

- **Catalog:** `custom_pin_types` table (global, not per-community)
- **Pin identity:** `pins.pin_type = custom:<slug>` with values in `pins.custom_data` (jsonb)
- **Built-in types:** `one_time`, `scheduled`, `food_bank`, `other` (unchanged columns)

## Who can do what

| Action | Who |
|--------|-----|
| Create a custom type | Any logged-in user (`/pin-types/new`, `POST /api/pin_types`) |
| Edit/delete a type | Creator or site admin (`admin_level >= 1`) |
| Use on world map | Any user who can post pins — all enabled global custom types |
| Enable types in a community | Community owner (`/m/:url/settings`) |

## Community settings keys

```json
{
  "enabled_builtin_pin_types": ["one_time", "other"],
  "enabled_custom_pin_types": ["pinball-arcade"]
}
```

Legacy `allowed_pin_types` in sub-map settings is migrated to `enabled_builtin_pin_types` on read.

## Field schema (v1)

Supported field types: `text`, `textarea`, `number`, `boolean`, `select`, `url`, `list` (of text), `music`. See [MUSIC_FIELDS.md](MUSIC_FIELDS.md) for storage, payload format, and API.

```json
{
  "fields": [
    { "key": "machine_status", "type": "select", "label": "Status", "required": true,
      "options": [{"value": "working", "label": "Working"}] }
  ]
}
```

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/pin_types` | Public list of enabled types |
| POST | `/api/pin_types` | Auth required |
| PATCH | `/api/pin_types/:id` | Creator or admin |
| PATCH | `/api/sub_maps/:url/pin_type_settings` | Mod+ allowlist |

Sub-map `GET /api/sub_maps/:url` includes `available_custom_pin_types` with full schemas for enabled types.

## UI routes

- `/pin-types` — browse catalog (public)
- `/pin-types/new`, `/pin-types/:id/edit` — create/edit (auth)
- `/m/:community_url/settings` — community settings including pin type allowlist (owner)

## Schema changes

- Adding fields: existing pins omit new keys
- Removing fields: orphaned keys remain in DB but are hidden; stripped on save
- Deleting a type: blocked while pins reference it; use `enabled: false` instead
