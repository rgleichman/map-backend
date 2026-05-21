defmodule StorymapWeb.AdminNavSyncTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.AccountsFixtures
  alias Storymap.Repo

  test "AdminNavLive updates active state on path_changed pubsub", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    {:ok, view, _html} =
      live_isolated(conn, StorymapWeb.AdminNavLive,
        session: %{
          "user_id" => admin.id,
          "variant" => "desktop",
          "current_path" => "/admin/reports"
        }
      )

    assert render(view) =~ "btn-active"

    Phoenix.PubSub.broadcast(Storymap.PubSub, StorymapWeb.AdminNavSync.nav_topic(), {
      :path_changed,
      "/admin/activity"
    })

    html = render(view)
    assert html =~ ~s(aria-label="Admin activity")
    assert html =~ "btn-active"
    refute html =~ ~s(aria-label="Admin content reports") <> "btn-active"
  end
end
