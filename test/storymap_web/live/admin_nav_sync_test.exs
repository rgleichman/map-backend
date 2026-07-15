defmodule StorymapWeb.AdminNavSyncTest do
  use StorymapWeb.ConnCase, async: false

  import Phoenix.LiveViewTest

  alias Storymap.AccountsFixtures
  alias Storymap.Repo

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
    assert html =~ "btn-active"

    # Deliver the same message AdminNavSync broadcasts; avoids cross-test PubSub races.
    send(view.pid, {:path_changed, "/admin/activity"})

    html = render(view)
    assert html =~ ~s(aria-label="Admin activity")
    assert html =~ "btn-active"

    refute html =~
             ~s(/admin/reports" data-phx-link="redirect" data-phx-link-state="push" class="btn btn-ghost btn-sm btn-square btn-active)
  end
end
