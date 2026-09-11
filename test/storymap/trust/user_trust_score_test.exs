defmodule Storymap.Trust.UserTrustScoreTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust.UserTrustScore
  import Storymap.AccountsFixtures

  test "changeset requires score fields" do
    user = user_fixture()
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    assert {:ok, score} =
             %UserTrustScore{}
             |> UserTrustScore.changeset(%{
               user_id: user.id,
               t_social_raw: 0.1,
               t_social_cal: 0.5,
               t_id: 0.2,
               t_effective: 0.455,
               computed_at: now,
               params_version: "test"
             })
             |> Repo.insert()

    assert score.user_id == user.id
    assert score.t_effective == 0.455
  end
end
