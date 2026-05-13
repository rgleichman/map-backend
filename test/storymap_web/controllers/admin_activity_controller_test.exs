defmodule StorymapWeb.AdminActivityControllerTest do
  use StorymapWeb.ConnCase, async: true

  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.AdminActivity
  alias Storymap.Repo

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  test "returns unread_count for admin", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    before = AdminActivity.unread_count(scope)
    {:ok, _} = AdminActivity.record_event("ping", admin.id, %{})

    conn =
      conn
      |> log_in_user(admin)
      |> get(~p"/api/admin/activity/unread-count")

    assert %{"unread_count" => count} = json_response(conn, 200)
    assert count == before + 1
  end

  test "returns 403 for authenticated non-admin", %{conn: conn} do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    conn =
      conn
      |> log_in_user(user)
      |> get(~p"/api/admin/activity/unread-count")

    assert response(conn, 403)
  end

  test "returns 401 when not authenticated", %{conn: conn} do
    conn = get(conn, ~p"/api/admin/activity/unread-count")
    assert response(conn, 401)
  end
end
