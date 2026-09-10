defmodule Storymap.Trust.TrustVouchTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust.TrustVouch
  import Storymap.AccountsFixtures

  test "rejects self-vouch" do
    user = user_fixture()

    changeset =
      TrustVouch.changeset(%TrustVouch{}, %{
        actor_user_id: user.id,
        subject_user_id: user.id
      })

    refute changeset.valid?
    assert %{subject_user_id: _} = errors_on(changeset)
  end

  test "inserts unique actor/subject pair" do
    actor = user_fixture()
    subject = user_fixture()

    assert {:ok, _} =
             %TrustVouch{}
             |> TrustVouch.changeset(%{actor_user_id: actor.id, subject_user_id: subject.id})
             |> Repo.insert()

    assert {:error, changeset} =
             %TrustVouch{}
             |> TrustVouch.changeset(%{actor_user_id: actor.id, subject_user_id: subject.id})
             |> Repo.insert()

    assert %{actor_user_id: _} = errors_on(changeset)
  end
end
