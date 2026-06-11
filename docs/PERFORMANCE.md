# Performance benchmarks and monitoring

## Hot paths

| Path | Module / route | Notes |
|------|----------------|-------|
| World pin list | `GET /api/pins` → `Pins.list_pins/0` | Preloads tags + sub_map; partial index on approved world-visible pins |
| Community pins | `GET /api/sub_maps/:url/pins` → `SubMaps.list_pins/3` | Indexed on `(sub_map_id, status)` |
| Community browse | `GET /api/sub_maps` → `SubMaps.list_public/1` | Batched pin/member counts (no per-row N+1) |
| Map style | `GET /api/map/style` | In-memory MapLibre spec + ETag caching |
| Tag attach | `Tags.get_or_create_tags_by_names/1` | Single SELECT + inserts for missing tags |

## Running performance tests

All performance tests live under `test/**/performance/` and run as part of the normal suite:

```bash
mix test
```

Run only performance tests:

```bash
mix test test/storymap/performance test/storymap_web/performance
```

Run a single file:

```bash
mix test test/storymap/performance/hot_paths_test.exs
```

### What the tests check

- **Query count ceilings** via `Storymap.PerformanceHelpers.with_query_count/1` (Ecto `[:storymap, :repo, :query]` telemetry)
- **Wall-clock budgets** via `assert_under_ms/2` (`:timer.tc/1`)

Budgets are generous for CI; tighten locally when profiling regressions.

## Runtime monitoring

Phoenix LiveDashboard (dev) exposes telemetry from `StorymapWeb.Telemetry`, including:

- `phoenix.router_dispatch.stop.duration` (per route)
- `storymap.repo.query.*` (DB time, queue time, decode time)

Start the server and open `/dev/dashboard` while exercising map pages to watch request and query latency.

## Database indexes

Migration `20260610120000_add_performance_indexes.exs` adds:

- `sub_maps_public_inserted_at_idx` — public community browse
- `pins_world_map_updated_at_idx` — world pin listing (partial)
- `sub_map_memberships_sub_map_id_status_idx` — member counts

Apply with `mix ecto.migrate`.

## Profiling tips

```bash
# Count queries in IEx
:telemetry.attach("q", [:storymap, :repo, :query], fn _, _, _, _ -> IO.puts("query") end, nil)

# Time a context call
:timer.tc(fn -> Storymap.Pins.list_pins() end)
```

For deeper analysis, use `EXPLAIN ANALYZE` on the SQL logged when `config :storymap, Storymap.Repo, log: :info` in dev.
