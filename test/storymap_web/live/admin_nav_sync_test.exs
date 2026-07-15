defmodule StorymapWeb.AdminNavSyncTest do
  use StorymapWeb.ConnCase, async: false

  import Phoenix.LiveViewTest

  alias Storymap.AccountsFixtures
  alias Storymap.Repo

  @active_class "bg-base-200/90 dark:bg-base-300/70"

  test "AdminNavLive updates active state on path_changed", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    {:ok, view, html} =
      live_isolated(conn, StorymapWeb.AdminNavLive,
        session: %{
          "user_id" => admin.id,
          "variant" => "desktop",
          "current_path" => "/admin/reports"
        }
      )

    assert html =~ ~s(href="/admin/reports")
    assert html =~ ~s(aria-label="Admin content reports")
    assert has_element?(view, ~s(a[aria-label="Admin content reports"][aria-current="page"]))
    assert html =~ @active_class

    # Deliver the same message AdminNavSync broadcasts; avoids cross-test PubSub races.
    send(view.pid, {:path_changed, "/admin/activity"})

    html = render(view)
    assert html =~ ~s(aria-label="Admin activity")
    assert has_element?(view, ~s(a[aria-label="Admin activity"][aria-current="page"]))
    refute has_element?(view, ~s(a[aria-label="Admin content reports"][aria-current="page"]))
    assert html =~ @active_class
  end
end
