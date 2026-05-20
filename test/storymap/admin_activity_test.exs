defmodule Storymap.AdminActivityTest do
  use Storymap.DataCase, async: true

  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.AdminActivity
  alias Storymap.Repo

  test "list_events_for_admin returns [] for non-admin" do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))
    {:ok, _} = AdminActivity.record_event("audit", nil, %{"n" => 1})

    assert AdminActivity.list_events_for_admin(Scope.for_user(user)) == []
  end

  test "unread_count is 0 for non-admin" do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    assert AdminActivity.unread_count(Scope.for_user(user)) == 0
  end

  test "mark_read and mark_unread update unread and noop when nothing to delete" do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    base = AdminActivity.unread_count(scope)
    {:ok, event} = AdminActivity.record_event("ping", admin.id, %{})

    assert AdminActivity.unread_count(scope) == base + 1
    assert {:ok, _} = AdminActivity.mark_read(scope, event.id)
    assert AdminActivity.unread_count(scope) == base

    assert {:ok, :cleared} = AdminActivity.mark_unread(scope, event.id)
    assert AdminActivity.unread_count(scope) == base + 1

    assert {:ok, :noop} = AdminActivity.mark_unread(scope, event.id)
    assert AdminActivity.unread_count(scope) == base + 1
  end

  test "mark_all_read clears all unread for admin" do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    base = AdminActivity.unread_count(scope)
    {:ok, _} = AdminActivity.record_event("a", admin.id, %{})
    {:ok, _} = AdminActivity.record_event("b", admin.id, %{})

    assert AdminActivity.unread_count(scope) == base + 2
    assert :ok = AdminActivity.mark_all_read(scope)
    assert AdminActivity.unread_count(scope) == 0
  end

  test "content_reported does not count toward unread" do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    base = AdminActivity.unread_count(scope)

    {:ok, event} = AdminActivity.record_event("content_reported", nil, %{"report_id" => 1})

    assert event.counts_toward_unread == false
    assert AdminActivity.unread_count(scope) == base
  end

  test "mark_read returns unauthorized for non-admin" do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    assert AdminActivity.mark_read(Scope.for_user(user), 1) == {:error, :unauthorized}
  end

  test "mark_unread returns unauthorized for non-admin" do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    assert AdminActivity.mark_unread(Scope.for_user(user), 1) == {:error, :unauthorized}
  end
end
