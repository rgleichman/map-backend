defmodule StorymapWeb.AdminNavLiveTest do
  use StorymapWeb.ConnCase, async: false

  import Phoenix.LiveViewTest

  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.AdminActivity
  alias Storymap.Repo

  test "badge count updates when activity is marked read", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    scope = Scope.for_user(admin)

    {:ok, event} = AdminActivity.record_event("ping", admin.id, %{})

    {:ok, view, html} =
      live_isolated(conn, StorymapWeb.AdminNavLive,
        session: %{
          "user_id" => admin.id,
          "variant" => "desktop",
          "current_path" => "/map"
        }
      )

    assert html =~ "admin-activity-unread-badge"
    assert render(view) =~ Integer.to_string(AdminActivity.unread_count(scope))

    assert {:ok, _} = AdminActivity.mark_read(scope, event.id)

    assert render(view) =~ Integer.to_string(AdminActivity.unread_count(scope))
  end

  test "renders admin nav badges in root layout for admin on map page", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    conn = log_in_user(conn, admin)

    html = conn |> get(~p"/") |> html_response(200)

    assert html =~ "admin-activity-unread-badge"
    assert html =~ "admin-reports-unresolved-badge"
    assert html =~ ~p"/admin/activity"
    assert html =~ ~p"/admin/reports"
  end

  test "receives counts_changed over AdminPubSub", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    {:ok, view, _html} =
      live_isolated(conn, StorymapWeb.AdminNavLive,
        session: %{
          "user_id" => admin.id,
          "variant" => "desktop",
          "current_path" => "/admin/activity"
        }
      )

    send(view.pid, {:counts_changed, %{activity_unread: 7, reports_unresolved: 3}})

    html = render(view)
    assert html =~ "7"
    assert html =~ "3"
  end
end
