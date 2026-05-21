defmodule Storymap.AdminPubSubTest do
  use Storymap.DataCase, async: false

  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.AdminActivity
  alias Storymap.AdminPubSub
  alias Storymap.Repo

  test "broadcast_counts_changed after mark_read includes admin_user_id" do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)
    admin_id = admin.id

    AdminPubSub.subscribe()
    {:ok, event} = AdminActivity.record_event("ping", admin.id, %{})

    assert_receive {:counts_changed, ^admin_id, %{activity_unread: n}} when n >= 1
    flush_messages()

    assert {:ok, _} = AdminActivity.mark_read(scope, event.id)

    assert_receive {:counts_changed, ^admin_id, counts}
    assert counts.activity_unread == AdminActivity.unread_count(scope)
  end

  test "content_reported event does not increment activity unread" do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    base = AdminActivity.unread_count(scope)
    {:ok, event} = AdminActivity.record_event("content_reported", nil, %{"report_id" => 1})

    assert event.counts_toward_unread == false
    assert AdminActivity.unread_count(scope) == base
  end

  defp flush_messages do
    receive do
      _ -> flush_messages()
    after
      0 -> :ok
    end
  end
end
