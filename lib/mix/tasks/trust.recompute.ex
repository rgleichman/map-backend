defmodule Mix.Tasks.Trust.Recompute do
  @shortdoc "Recompute all user trust scores"
  @moduledoc """
  Rebuilds `user_trust_scores` from the trust ledger.

      mix trust.recompute

  See `docs/TRUST.md`.
  """
  use Mix.Task

  @requirements ["app.start"]

  @impl Mix.Task
  def run(_args) do
    {:ok, count} = Storymap.Trust.Scores.recompute_all()
    Mix.shell().info("Recomputed trust scores for #{count} user(s).")
  end
end
