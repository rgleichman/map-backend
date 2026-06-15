# Pin description links

Pin descriptions are stored as plain text. When displayed on the map or pin
catalog, the app turns recognized links into clickable anchors.

## Supported link formats

| Format | Example | Opens as |
|--------|---------|----------|
| Bare domain | `example.com` | `https://example.com` |
| Bare domain with path | `example.com/about` | `https://example.com/about` |
| `www` domain | `www.example.com` | `https://www.example.com` |
| Full URL | `https://example.com` | unchanged |
| Markdown link | `[our site](example.com)` | `https://example.com` |
| Bare email | `team@example.com` | `mailto:team@example.com` |
| Bare mailto | `mailto:team@example.com` | mail client |
| Markdown email | `[Email us](team@example.com)` | `mailto:team@example.com` |
| Markdown mailto | `[Email us](mailto:team@example.com)` | mail client |

`http://` and `https://` are optional for web links. Scheme-less domains are
always opened with `https://`. Email links open in the user's mail client (not
a new browser tab).

## Examples

```
Food pantry hours: example.org/hours

Questions? team@example.org

More info: [city website](www.city.gov/parks)
```

## Not supported

- Other markdown (bold, lists, headings, etc.) — shown as plain text
- Schemes other than `http`, `https`, and `mailto` (e.g. `javascript:`, `ftp:`)
- HTML tags — escaped and shown as text
- Descriptions longer than 5000 characters (rejected on save)

## Where links render

- Map pin popup (React)
- `/pins` catalog list (LiveView)

Admin moderation views show the raw description source text.
