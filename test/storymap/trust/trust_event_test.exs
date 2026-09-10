defmodule Storymap.Trust.TrustEventTest do
  use Storymap.DataCase, async: true

  alias Storymap.Trust.TrustEvent
  import Storymap.AccountsFixtures

  test "changeset requires type, actor, and subject" do
    changeset = TrustEvent.changeset(%TrustEvent{}, %{})
    refute changeset.valid?
    assert %{type: _, actor_user_id: _, subject_user_id: _} = errors_on(changeset)
  end

  test "pin_approve requires pin_id" do
    user = user_fixture()

    changeset =
      TrustEvent.changeset(%TrustEvent{}, %{
        type: :pin_approve,
        actor_user_id: user.id,
        subject_user_id: user.id
      })

    refute changeset.valid?
    assert %{pin_id: _} = errors_on(changeset)
  end

  test "vouch event inserts without pin" do
    actor = user_fixture()
    subject = user_fixture()

    assert {:ok, event} =
             %TrustEvent{}
             |> TrustEvent.changeset(%{
               type: :vouch,
               actor_user_id: actor.id,
               subject_user_id: subject.id
             })
             |> Repo.insert()

    assert event.type == :vouch
    assert event.pin_id == nil
  end
end
