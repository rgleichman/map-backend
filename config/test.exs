import Config

# Only in tests, remove the complexity from the password hashing algorithm
config :bcrypt_elixir, :log_rounds, 1

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :storymap, Storymap.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "storymap_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :storymap, StorymapWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "TppzKSXpZSsh5GdBdX0X2lru+J3PjR9ImBHCuJZjImcTKtcymx0qoVXdneSEageu",
  server: false

# In test we don't send emails
config :storymap, Storymap.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Disable rate limiting in tests
config :storymap, StorymapWeb.Plugs.RateLimit, enabled: false

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Tile cache: enabled in test so MapController tile tests run; use temp dir
config :storymap, :tile_cache_enabled, true
config :storymap, :tile_cache_dir, Path.join(System.tmp_dir!(), "storymap_tile_cache_test")

# Enable helpful, but potentially expensive runtime checks
config :phoenix_live_view,
  enable_expensive_runtime_checks: true
