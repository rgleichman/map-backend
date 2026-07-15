# Music fields

Custom pin types can include a `music` field so users compose short patterns in the map UI and play them from pin popups. See also [CUSTOM_PIN_TYPES.md](CUSTOM_PIN_TYPES.md).

## Overview

Music data is **not** stored inline in `pins.custom_data`. Payloads can be large (up to 1 MB), so they live in a separate table and the pin only keeps a small reference.

| Layer | What is stored |
|-------|----------------|
| Custom pin type schema | Field definition: `{ "key": "song", "type": "music", "label": "Song" }` |
| `pins.custom_data` | Reference only: `{ "song": { "ref": 42 } }` |
| `pin_field_blobs` | Full score text (`payload`), keyed by pin + field |

Built-in pin types (`one_time`, `scheduled`, etc.) do not use music fields. Only `custom:<slug>` pins whose schema declares a `music` field can attach music.

## Storage (`pin_field_blobs`)

| Column | Purpose |
|--------|---------|
| `pin_id` | Parent pin (cascade delete) |
| `field_key` | Matches the schema field `key` (max 64 chars) |
| `type` | Always `"music"` today |
| `format` | `"music/v1"` (default) |
| `version` | Integer schema version (default `1`) |
| `payload` | Opaque score string (max **1,048,576 bytes**) |

Unique on `(pin_id, field_key, type)` — one blob per music field per pin.

### `custom_data` reference shape

The validator accepts either form:

```json
{ "ref": 42 }
```

or a bare integer id (`42`). The API always writes `%{"ref" => id}` on upsert.

`custom_data` itself remains capped at **16 KB** total; only the reference counts toward that limit.

## Payload formats

The score is stored as a **text** string. The editor serializes to JSON v1; playback accepts older formats for compatibility.

### v1 grid (canonical)

Written by the in-app sequencer (`assets/js/react/utils/musicScore.ts`):

```json
{
  "version": 1,
  "tempo": 120,
  "steps": 16,
  "rows": [
    { "note": "C4", "hits": [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false] },
    { "note": "D4", "hits": [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false] }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `version` | Must be `1` for grid format |
| `tempo` | BPM (40–220 in the UI; any positive number in payload) |
| `steps` | Number of columns (4–32; default 16) |
| `rows` | One row per note; `hits[i]` is on for step `i` |

Default note rows: `C4` through `C5` (8 notes). Notes use scientific pitch notation (`C4`, `F#4`, `Bb3`).

Playback scans columns left to right; within a column, all active rows sound together.

### Legacy formats (read-only compatibility)

**Plain text** — space- or newline-separated notes, played sequentially at 120 BPM:

```
C4 D4 E4 G4
```

**Legacy JSON** — sequential note list:

```json
{ "tempo": 120, "notes": ["C4", "E4", "G4"] }
```

Legacy payloads are converted into the v1 grid when loaded in the editor.

## API

All music field routes require an authenticated session and CSRF token (same as other pin writes). Mutations use the pin **update** authorizer (owner, or community mod where applicable).

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/pins/:id/music_fields/:field_key` | — | `{ "data": { "id", "pin_id", "field_key", "type", "format", "version", "payload" } }` |
| `POST` | `/api/pins/:id/music_fields/:field_key` | `{ "payload": "..." }` or `{ "music_field": { "payload", "format", "version" } }` | Updated pin JSON (`PinJSON`) |
| `PUT` | Same as POST (upsert) | | Updated pin JSON |
| `DELETE` | `/api/pins/:id/music_fields/:field_key` | — | Updated pin JSON; blob removed |

`field_key` must match a `music` field on the pin's custom type. Otherwise `422` with `field_key` error.

Required music fields cannot be deleted (`422`).

Fetching a blob (`GET`) currently requires the same permission as updating the pin.

## UI flow

### Defining a music field

1. Create or edit a custom pin type at `/pin-types/new` or `/pin-types/:id/edit`.
2. Add a field with type **Music** (stored as `"music"` in the schema).

### Composing on a pin

1. Place a pin using that custom type and **save the pin first** (music API needs `pin_id`).
2. Edit the pin → the music field shows a **16-step sequencer** (8 notes, tempo, preview, undo, clear).
3. **Save** uploads the payload and stores `{ "ref": id }` in `custom_data`.
4. **Remove** deletes the blob and clears the reference.

On edit, if a reference already exists, the score loads automatically.

### Playing in a popup

Pin popups show **Play** for music fields with a saved reference. The client fetches the payload on demand, caches it, and plays via WebAudio (`assets/js/react/utils/musicAudio.ts`).

## Key code locations

| Area | Path |
|------|------|
| Blob schema | `lib/storymap/pins/pin_field_blob.ex` |
| Context (upsert/delete/get) | `lib/storymap/pins.ex` |
| API controller | `lib/storymap_web/controllers/pin_music_field_controller.ex` |
| Field type in schema validator | `lib/storymap/pin_types/schema.ex`, `validator.ex` |
| Score parse/serialize | `assets/js/react/utils/musicScore.ts` |
| Sequencer UI | `assets/js/react/components/music/` |
| Pin composer integration | `assets/js/react/components/CustomPinFields.tsx` |

## Limits and validation

- Payload max size: **262,144 bytes** (app + DB constraint).
- `custom_data` max size: **16,384 bytes** (unchanged; music refs are tiny).
- Music field values in `custom_data` must be a positive integer id or `%{"ref" => id}`.
- No external audio URLs or file uploads — in-app composition only.

## Drawing soundtrack (embedded)

Drawing field blobs (`drawing/v1`) may include an optional embedded music grid as `soundtrack` on the drawing JSON payload (same v1 grid shape as above). Column count matches frame count (1–8); each column is the chord for that animation frame. Drawing **Play** advances frames at the drawing FPS and triggers that column’s notes. Map previews stay silent. See `assets/js/react/utils/drawingPayload.ts` and the drawing canvas sequencer.
