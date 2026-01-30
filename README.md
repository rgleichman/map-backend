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

## Setup

To start your Phoenix server:

* Run `mix setup` to install and setup dependencies
* Run `./scripts/install-git-hooks` once so `mix precommit` runs automatically before each commit
* Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

* Official website: https://www.phoenixframework.org/
* Guides: https://hexdocs.pm/phoenix/overview.html
* Docs: https://hexdocs.pm/phoenix
* Forum: https://elixirforum.com/c/phoenix-forum
* Source: https://github.com/phoenixframework/phoenix
