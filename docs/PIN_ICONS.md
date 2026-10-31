# Pin icons

Marker glyphs stored on catalog rows as `pin_types.icon`. See also
[CUSTOM_PIN_TYPES.md](CUSTOM_PIN_TYPES.md).

## Source art

The plant set comes from a hand-drawn sheet:

- Original scan: `assets/images/pin-icons/plant-icons.tiff` (Adobe Scan, flattened RGBA)
- The TIFF is **not** a layered Photoshop file. The artist used four discrete gray
  inks on white paper; those inks are recovered by snapping pixels to the palette
  below and tracing each ink as its own SVG layer.

| Layer | Gray (0–255) | Role |
|-------|--------------|------|
| `ink` | 0 | Outlines |
| `dark` | 107 | Darker fills |
| `mid` | 165 | Medium fills |
| `light` | 215 | Pale fills |

White (~255) is paper and is dropped. Anti-aliased pixels snap to the nearest
ink (or paper); specks are cleaned before tracing. Not every plant uses every
layer (e.g. grapes are `light` + `ink`; seed is `ink` only).

Traced geometry lives in `assets/shared/pin_icons.json` (24×24 viewBox, evenodd
fill paths). Do not edit path `d` by hand unless you are regenerating from the
TIFF.

Built-in glyphs (`carrot`, `calendar`, `building`, `star`) are also in that JSON:
Lucide carrot (stroke) and Heroicons calendar/building/star (solid fill). They
are not from the plant sheet.

## Catalog shape

```json
{
  "order": ["carrot", "grapes", "..."],
  "icons": {
    "grapes": {
      "label": "Grapes",
      "style": "fill",
      "layers": [
        { "name": "light", "gray": 215, "paths": [{ "d": "...", "fillRule": "evenodd" }] },
        { "name": "ink", "gray": 0, "paths": [{ "d": "...", "fillRule": "evenodd" }] }
      ]
    }
  }
}
```

- `style`: `fill` (plants and most builtins) or `stroke` (`carrot` only)
- `order`: picker and `Storymap.PinTypes.Icons.names/0`
- Wire name is the JSON key (`"grapes"`), stored on `pin_types.icon`

## Recolor

UI glyphs (`PinTypeIcon`, LiveView `<.pin_glyph>`) inherit `currentColor`.
Map marker images paint the glyph with the pin type’s icon color (DB/API
`marker_color`, UI label **Icon color**) on a disc filled with
`icon_background_color` (UI **Icon background**, default `#000000`).
Each layer’s original `gray` maps to fill-opacity so light fills stay visible:

| Gray | Opacity |
|------|---------|
| ≤ 20 (`ink`) | 1.00 |
| ≤ 120 (`dark`) | 0.72 |
| ≤ 185 (`mid`) | 0.48 |
| else (`light`) | 0.28 |

Keep the same steps in both `Storymap.PinTypes.Icons.layer_opacity/1` and
`layerFillOpacity` in `assets/js/react/utils/pinTypeIcons.tsx`. Stroke icons
ignore gray and draw at full opacity.

## Runtime

- **Allowlist:** `PinType.changeset/2` accepts only names in `pin_icons.json`
  (`Icons.valid?/1`). Unknown strings are rejected; blank/`nil` is allowed
  (React falls back by slug, then `star`).
- **LiveView picker:** `/pin-types/new` and `/pin-types/:id/edit` render
  `<.pin_glyph>` from the compiled JSON (path data is never taken from the form).
- **Map / React:** `pinIconName` resolves catalog `icon` → `PIN_ICON_DEFS`;
  MapLibre markers draw the layered glyph on a disc at 50×50
  (`createPinTypeMarkerSVG`; fill from `icon_background_color`, default black),
  with a colored ring for selected / new / awaiting / pending.
- **TypeScript union:** `PinIconName` in `assets/js/react/types.ts` must stay in
  sync with JSON keys and `PinIcon` in `pinTypeIcons.tsx`.

System type fallbacks when `icon` is blank: `one_time` → carrot, `scheduled` →
calendar, `food_bank` → building, `other` → star.

## Adding or replacing plants

1. Keep or replace `assets/images/pin-icons/plant-icons.tiff`.
2. Re-run the conversion script below (needs Pillow, numpy, and
  [potracer](https://pypi.org/project/potracer/)).
3. Add any new slug to `PinIconName`, `PinIcon`, and `order`.
4. Recompile Elixir (`Icons` loads JSON at compile time via `@external_resource`).

## Conversion script

This is the one-off used to build `assets/shared/pin_icons.json` from the TIFF
(plus the four existing builtin glyphs). Bounding boxes were taken from
ImageMagick connected-components on the scan. Crop coordinates are
`x, y, w, h` in TIFF pixels.

```python
#!/usr/bin/env python3
"""Trace plant-icons.tiff gray inks into assets/shared/pin_icons.json."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from potrace import Bitmap

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/images/pin-icons/plant-icons.tiff"
OUT = ROOT / "assets/shared/pin_icons.json"

# (name, label, x, y, w, h) — ImageMagick bbox of each drawing
ICONS = [
    ("pinecone", "Pinecone", 1075, 450, 49, 138),
    ("grapes", "Grapes", 1305, 591, 139, 201),
    ("sprout", "Sprout", 1070, 614, 85, 199),
    ("leaf", "Leaf", 230, 702, 79, 157),
    ("bud", "Bud", 609, 709, 133, 121),
    ("cotton", "Cotton", 432, 732, 77, 121),
    ("daisy", "Daisy", 1187, 886, 87, 175),
    ("sprig", "Sprig", 1349, 893, 85, 145),
    ("berries", "Berries", 933, 895, 96, 171),
    ("trowel", "Trowel", 758, 904, 71, 176),
    ("mushrooms", "Mushrooms", 433, 926, 174, 171),
    ("hop", "Hop", 1400, 1124, 97, 150),
    ("dandelion", "Dandelion", 1172, 1138, 139, 192),
    ("seed", "Seed", 974, 1156, 107, 197),
    ("toadstools", "Toadstools", 160, 1165, 137, 162),
    ("fiddlehead", "Fiddlehead", 657, 1181, 155, 241),
]

LAYER_GRAYS = [("light", 215), ("mid", 165), ("dark", 107), ("ink", 0)]
PALETTE = np.array([g for _, g in LAYER_GRAYS] + [255], dtype=np.float32)
VIEW = 24.0
MARGIN = 1.15
TRACE_SIZE = 96
PAD_PX = 16
SNAP_MAX = 22  # only snap if within this of a palette gray

# Existing Lucide/Heroicons glyphs (not from the TIFF).
BUILTINS = {
    "carrot": {
        "label": "Carrot",
        "style": "stroke",
        "layers": [{
            "name": "ink",
            "gray": 0,
            "paths": [
                {"d": "M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"},
                {"d": "M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"},
                {"d": "M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"},
            ],
        }],
    },
    "calendar": {
        "label": "Calendar",
        "style": "fill",
        "layers": [{
            "name": "ink",
            "gray": 0,
            "paths": [{
                "d": "M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z",
                "fillRule": "evenodd",
                "clipRule": "evenodd",
            }],
        }],
    },
    "building": {
        "label": "Building",
        "style": "fill",
        "layers": [{
            "name": "ink",
            "gray": 0,
            "paths": [
                {"d": "M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 0 0 7.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 0 0 4.902-5.652l-1.3-1.299a1.875 1.875 0 0 0-1.325-.549H5.223Z"},
                {
                    "d": "M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 0 0 9.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 0 0 2.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3Zm3-6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1-.75-.75v-3Zm8.25-.75a.75.75 0 0 0-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-5.25a.75.75 0 0 0-.75-.75h-3Z",
                    "fillRule": "evenodd",
                    "clipRule": "evenodd",
                },
            ],
        }],
    },
    "star": {
        "label": "Star",
        "style": "fill",
        "layers": [{
            "name": "ink",
            "gray": 0,
            "paths": [{
                "d": "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.267 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.267-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z",
                "fillRule": "evenodd",
                "clipRule": "evenodd",
            }],
        }],
    },
}


def xy(p):
    return (float(p.x), float(p.y)) if hasattr(p, "x") else (float(p[0]), float(p[1]))


def fmt(n: float) -> str:
    s = f"{n:.1f}"
    return s[:-2] if s.endswith(".0") else s


def curve_to_d(curve, xf) -> str:
    sx, sy = xf(*xy(curve.start_point))
    parts = [f"M{fmt(sx)} {fmt(sy)}"]
    for seg in curve:
        if seg.is_corner:
            cx, cy = xf(*xy(seg.c))
            ex, ey = xf(*xy(seg.end_point))
            parts.append(f"L{fmt(cx)} {fmt(cy)}L{fmt(ex)} {fmt(ey)}")
        else:
            x1, y1 = xf(*xy(seg.c1))
            x2, y2 = xf(*xy(seg.c2))
            ex, ey = xf(*xy(seg.end_point))
            parts.append(f"C{fmt(x1)} {fmt(y1)} {fmt(x2)} {fmt(y2)} {fmt(ex)} {fmt(ey)}")
    parts.append("Z")
    return " ".join(parts)


def snap_layers(gray: np.ndarray) -> dict[str, np.ndarray]:
    luma = gray.astype(np.float32)
    d = np.abs(luma[..., None] - PALETTE[None, None, :])
    dist = d.min(axis=2)
    idx = d.argmin(axis=2)
    close = dist <= SNAP_MAX
    out = {}
    for i, (name, _g) in enumerate(LAYER_GRAYS):
        mask = (idx == i) & close
        if name == "ink":
            mask = mask | ((~close) & (luma < 80))
        out[name] = mask
    return out


def clean_mask(mask: np.ndarray, name: str) -> np.ndarray:
    img = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
    if name == "ink":
        img = img.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    else:
        img = img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return np.array(img) > 127


def make_transform(h, w):
    size = max(h, w)
    scale = (VIEW - 2 * MARGIN) / size

    def xf(x, y):
        return (x - w / 2) * scale + VIEW / 2, (y - h / 2) * scale + VIEW / 2

    return xf


def trace_mask(mask: np.ndarray, xf) -> list[dict]:
    if mask.sum() < 12:
        return []
    img = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8), mode="L")
    path = Bitmap(img, blacklevel=0.5).trace(
        turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.35
    )
    ds = [curve_to_d(c, xf) for c in path if c]
    if not ds:
        return []
    return [{"d": " ".join(ds), "fillRule": "evenodd"}]


def extract_plants(full: np.ndarray) -> dict:
    H, W = full.shape
    plants = {}
    for name, label, x, y, w, h in ICONS:
        left, top = max(0, x - PAD_PX), max(0, y - PAD_PX)
        right, bottom = min(W, x + w + PAD_PX), min(H, y + h + PAD_PX)
        crop = full[top:bottom, left:right]
        masks = snap_layers(crop)
        union = np.zeros_like(crop, dtype=bool)
        cleaned = {}
        for lname, _g in LAYER_GRAYS:
            cleaned[lname] = clean_mask(masks[lname], lname)
            union |= cleaned[lname]
        ys, xs = np.where(union)
        if len(xs) == 0:
            continue
        sl = np.s_[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
        uh, uw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        scale = TRACE_SIZE / max(uh, uw)
        nh, nw = max(1, int(round(uh * scale))), max(1, int(round(uw * scale)))
        xf = make_transform(nh, nw)
        layers = []
        for lname, gval in LAYER_GRAYS:
            m = cleaned[lname][sl]
            img = Image.fromarray((m.astype(np.uint8) * 255), mode="L")
            img = img.resize((nw, nh), Image.Resampling.NEAREST)
            paths = trace_mask(np.array(img) > 127, xf)
            if paths:
                layers.append({"name": lname, "gray": gval, "paths": paths})
        plants[name] = {"label": label, "style": "fill", "layers": layers}
    return plants


def main():
    full = np.array(Image.open(SRC).convert("L"))
    plants = extract_plants(full)
    order = list(BUILTINS) + [name for name, *_ in ICONS]
    icons = dict(BUILTINS)
    icons.update(plants)
    OUT.write_text(json.dumps({"order": order, "icons": icons}, indent=2) + "\n")
    print("wrote", OUT, "plants", list(plants))


if __name__ == "__main__":
    main()
```

Run from a venv (this is not a project dependency):

```bash
python3 -m venv /tmp/pin-icons-venv
/tmp/pin-icons-venv/bin/pip install Pillow numpy potracer
/tmp/pin-icons-venv/bin/python path/to/the/script.py
```
