# Performance budget tests: mix test --include performance
ExUnit.start(exclude: [:performance])
Ecto.Adapters.SQL.Sandbox.mode(Storymap.Repo, :manual)

# Warm TzWorld once so async pin fixtures do not each pay ~3s DETS load.
_ = TzWorld.version()
