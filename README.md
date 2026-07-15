# Storymap

## Windows (WSL2)

**Native Windows is not supported.** On Windows, develop inside **WSL2 with Ubuntu**, then follow [Prerequisites (Ubuntu)](#prerequisites-ubuntu) and [Setup](#setup) from a WSL shell.

1. Install [WSL2 and Ubuntu](https://learn.microsoft.com/windows/wsl/install).
2. Clone the repo on the **Linux filesystem** (for example `~/code/map-backend`), **not** under `/mnt/c/...`. The Windows mount is much slower and makes Elixir file watching unreliable.
3. Install Elixir, PostgreSQL, Node.js, and `inotify-tools` **inside WSL** using the Ubuntu steps below.
4. Run `./scripts/install-git-hooks` from WSL (not Git for Windows / PowerShell).
5. Start the server with `mix phx.server` in WSL, then open [`http://localhost:4000`](http://localhost:4000) in your Windows browser (WSL forwards localhost).

## Prerequisites (Ubuntu)

1. **Install Elixir**: Follow the [official installation guide](https://elixir-lang.org/install.html)

2. **Install PostgreSQL**:
   ```bash
   sudo apt install postgresql
   sudo systemctl start postgresql
   ```

3. **Set up PostgreSQL user**:
   ```bash
   sudo -u postgres psql
   ```
   Then in the PostgreSQL prompt:
   ```sql
   ALTER USER postgres WITH PASSWORD 'postgres';
   \q
   ```

4. **Install inotify-tools** (for file watching during development):
   ```bash
   sudo apt-get install inotify-tools
   ```

5. **Install Node.js dependencies**:
   ```bash
   cd assets
   npm install
   cd ..
   ```

6. **MapTiler API key (for map tiles)**  
   The map uses [MapTiler](https://www.maptiler.com/) for tiles. To get a free key for local development:
   * Sign up at [cloud.maptiler.com](https://cloud.maptiler.com/).
   * Open [Account → API keys](https://cloud.maptiler.com/account/keys/).
   * Use the default key shown there, or click **New key** and create one (no restrictions needed for dev).
   * In your project root, copy `.env.example` to `.env` and set `export MAPTILER_API_KEY=your_key_here` (replace with your key).

   For production, create a separate key and restrict it (e.g. allowed origins) in the MapTiler dashboard.

## Setup

To start your Phoenix server:

* Run `mix setup` to install and setup dependencies
* Run `mix tz_world.install --include-oceans` once to install timezone boundary data (required for pin schedule timezone lookup). Without `GITHUB_TOKEN`, this falls back to the unauthenticated upstream task.
* Run `./scripts/install-git-hooks` once so `mix precommit` runs automatically before each commit
* Copy `.env.example` to `.env` and add your MapTiler API key (see Prerequisites). The app loads `.env` automatically in dev; the file is gitignored.
* Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

### Production (Render)

`build.sh` runs `mix tz_world.install --include-oceans` during deploy. Set a **`GITHUB_TOKEN`** environment variable (read access to public repos is enough) so the build can query GitHub’s releases API without hitting unauthenticated rate limits on shared build hosts.

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

### Development tools

* **[LiveDashboard](http://localhost:4000/dev/dashboard)** (`/dev/dashboard`, dev only) — request and database telemetry while you exercise the app.
* See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) for performance tests, hot-path notes, and profiling tips.

#### Dialyzer (optional static analysis)

Dialyzer checks for type inconsistencies and impossible calls. It is **not** run by `mix precommit`; use it locally before larger refactors (especially enum or API boundary changes).

**One-time setup** (after `mix setup`, or whenever Elixir deps change):

```bash
mix dialyzer.setup
```

This builds a Persistent Lookup Table (PLT) under `priv/plts/` (gitignored). The first run can take several minutes; later runs reuse the PLT and are much faster.

**Run analysis:**

```bash
mix dialyzer
```

Known false positives are listed in `.dialyzer_ignore.exs`. Fix real warnings when you can; add narrowly scoped ignores only when Dialyzer cannot understand framework patterns (Ecto, LiveView, etc.).

**When to run:** before merging enum/policy changes, when adding `@spec` to context modules, or when debugging suspected string-vs-atom mismatches at API boundaries.

#### Types and `@spec` conventions

When you touch policy or context modules, add or update types alongside the change:

- **Shared result types** live in [`lib/storymap/types.ex`](lib/storymap/types.ex) (`Types.ecto_result/1`, `Types.authorize_result/0`, etc.).
- **Schemas** exposed in public APIs should define `@type t` (see [`lib/storymap/admin_activity/event.ex`](lib/storymap/admin_activity/event.ex)); reuse existing enum `@type` aliases on the same module.
- **Policy modules** — `@spec` every public function; booleans for `can_*?`, `Types.authorize_result()` for `authorize_*`.
- **Context modules** — `@spec` public functions; use `Scope.t()` for scoped calls and `Storymap.Types` for auth/Ecto tuples.
- **JSONB / form boundary maps** — Elixir typespecs do not support string-literal map keys; use `map()` or `String.t()` and keep runtime validation (e.g. `@field_types` in [`lib/storymap/pin_types/schema.ex`](lib/storymap/pin_types/schema.ex)).

Run `mix dialyzer` after adding specs; fix real mismatches in the same change rather than broad ignores.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

* Official website: https://www.phoenixframework.org/
* Guides: https://hexdocs.pm/phoenix/overview.html
* Docs: https://hexdocs.pm/phoenix
* Forum: https://elixirforum.com/c/phoenix-forum
* Source: https://github.com/phoenixframework/phoenix
