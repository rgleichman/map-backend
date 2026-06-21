# Storymap

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

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

* Official website: https://www.phoenixframework.org/
* Guides: https://hexdocs.pm/phoenix/overview.html
* Docs: https://hexdocs.pm/phoenix
* Forum: https://elixirforum.com/c/phoenix-forum
* Source: https://github.com/phoenixframework/phoenix
