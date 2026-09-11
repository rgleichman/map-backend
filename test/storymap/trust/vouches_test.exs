defmodule Storymap.Trust.VouchesTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust
  alias Storymap.Trust.TrustEvent
  alias Storymap.Trust.TrustVouch

  import Storymap.AccountsFixtures
  import Storymap.TrustFixtures

  test "vouch requires trust threshold" do
    actor = user_fixture()
    subject = user_fixture()
    put_trust_score!(actor.id, 0.1)

    assert {:error, :forbidden} = Trust.vouch(actor, subject.id)
  end

  test "vouch and revoke succeed for trusted actor" do
    actor = user_fixture()
    subject = user_fixture()
    put_trust_score!(actor.id, 0.75)

    assert {:ok, %TrustVouch{}} = Trust.vouch(actor, subject.id)

    assert Repo.get_by(TrustEvent,
             type: :vouch,
             actor_user_id: actor.id,
             subject_user_id: subject.id
           )

    assert Trust.vouch_budget_remaining(actor.id) == 4

    assert {:error, :already_vouched} = Trust.vouch(actor, subject.id)
    assert {:ok, :revoked} = Trust.revoke_vouch(actor, subject.id)
    assert Trust.vouch_budget_remaining(actor.id) == 5
    assert Repo.get_by(TrustEvent, type: :vouch_revoke, actor_user_id: actor.id)
  end

  test "vouch budget k is enforced" do
    actor = user_fixture()
    put_trust_score!(actor.id, 0.9)

    for _ <- 1..5 do
      subject = user_fixture()
      assert {:ok, _} = Trust.vouch(actor, subject.id)
    end

    assert Trust.vouch_budget_remaining(actor.id) == 0
    assert {:error, :vouch_budget} = Trust.vouch(actor, user_fixture().id)
  end

  test "self vouch is rejected" do
    actor = user_fixture()
    put_trust_score!(actor.id, 0.9)
    assert {:error, :self_vouch} = Trust.vouch(actor, actor.id)
  end

  test "recompute picks up vouch edge" do
    seed = user_fixture(%{admin_level: 1})
    subject = user_fixture()
    put_trust_score!(seed.id, 0.9)

    assert {:ok, _} = Trust.vouch(seed, subject.id)
    assert {:ok, _} = Trust.recompute_all()

    subject_score = Trust.get_score(subject.id)
    other = user_fixture()
    assert {:ok, _} = Trust.recompute_all()
    other_score = Trust.get_score(other.id)

    assert subject_score.t_social_raw > other_score.t_social_raw
  end
end
