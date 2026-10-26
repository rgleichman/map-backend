# Performance budget tests: mix test --include performance
ExUnit.start(exclude: [:performance])
Ecto.Adapters.SQL.Sandbox.mode(Storymap.Repo, :manual)

# Warm TzWorld once so async pin fixtures do not each pay DETS load.
# DetsWithIndexCache builds its index in `handle_continue`; that scan of the
# ~1GB DETS file can exceed TzWorld.version/0's 10s timeout under mix precommit
# (tests run in parallel with tsc and vitest).
_ = GenServer.call(TzWorld.Backend.DetsWithIndexCache, :version, 60_000)
