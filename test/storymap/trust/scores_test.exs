defmodule Storymap.Trust.ScoresTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust
  alias Storymap.Trust.Identity
  alias Storymap.Trust.LocalTrust
  alias Storymap.Trust.Scores
  alias Storymap.Trust.TrustVouch

  import Storymap.AccountsFixtures

  test "four-user clique: sockpuppets stay near zero raw mass" do
    seed = user_fixture(%{admin_level: 1})
    honest = user_fixture()
    x = user_fixture()
    y = user_fixture()

    insert_vouch!(seed.id, honest.id)
    insert_vouch!(x.id, y.id)
    insert_vouch!(y.id, x.id)

    assert {:ok, 4} = Scores.recompute_all()

    seed_score = Trust.get_score(seed.id)
    honest_score = Trust.get_score(honest.id)
    x_score = Trust.get_score(x.id)
    y_score = Trust.get_score(y.id)

    assert seed_score.t_social_raw + honest_score.t_social_raw > 0.9
    assert x_score.t_social_raw < 0.05
    assert y_score.t_social_raw < 0.05
    assert honest_score.t_social_cal > x_score.t_social_cal
  end

  test "identity bonus is commutative for confirmed users" do
    confirmed = user_fixture(%{confirmed_at: DateTime.utc_now(:second)})
    unconfirmed = unconfirmed_user_fixture()

    assert Identity.t_id(confirmed) == 0.2
    assert Identity.t_id(unconfirmed) == 0.0
  end

  test "decay with infinite half-life leaves weight unchanged" do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    earlier = DateTime.add(now, -30 * 86_400, :second)
    assert LocalTrust.decay(1.0, earlier, now, :infinity) == 1.0
  end

  test "decay halves after one half-life" do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    earlier = DateTime.add(now, -180 * 86_400, :second)
    w = LocalTrust.decay(1.0, earlier, now, 180.0)
    assert_in_delta w, 0.5, 0.001
  end

  test "recompute sets t_id from confirmation" do
    user = user_fixture()
    assert {:ok, _} = Scores.recompute_all()
    score = Trust.get_score(user.id)
    assert score.t_id == 0.2
  end

  defp insert_vouch!(actor_id, subject_id) do
    %TrustVouch{}
    |> TrustVouch.changeset(%{actor_user_id: actor_id, subject_user_id: subject_id})
    |> Repo.insert!()
  end
end
