defmodule Storymap.TrustTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust
  alias Storymap.Trust.UserTrustScore
  import Storymap.AccountsFixtures

  test "gates_enabled? defaults to false" do
    refute Trust.gates_enabled?()
  end

  test "effective_trust returns 0.0 when no score row" do
    user = user_fixture()
    assert Trust.effective_trust(user.id) == 0.0
  end

  test "effective_trust reads materialized score" do
    user = user_fixture()
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    {:ok, _} =
      %UserTrustScore{}
      |> UserTrustScore.changeset(%{
        user_id: user.id,
        t_social_raw: 0.0,
        t_social_cal: 0.8,
        t_id: 0.2,
        t_effective: 0.71,
        computed_at: now,
        params_version: "test"
      })
      |> Repo.insert()

    assert Trust.effective_trust(user.id) == 0.71
  end
end
