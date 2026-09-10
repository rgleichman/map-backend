defmodule Storymap.TrustFixtures do
  @moduledoc false

  alias Storymap.Repo
  alias Storymap.Trust.UserTrustScore

  def put_trust_score!(user_id, t_effective, attrs \\ %{}) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    base = %{
      user_id: user_id,
      t_social_raw: 0.0,
      t_social_cal: t_effective,
      t_id: 0.0,
      t_effective: t_effective * 1.0,
      computed_at: now,
      params_version: "test"
    }

    attrs = Map.merge(base, Map.new(attrs))

    case Repo.get_by(UserTrustScore, user_id: user_id) do
      nil ->
        %UserTrustScore{}
        |> UserTrustScore.changeset(attrs)
        |> Repo.insert!()

      existing ->
        existing
        |> UserTrustScore.changeset(attrs)
        |> Repo.update!()
    end
  end
end
