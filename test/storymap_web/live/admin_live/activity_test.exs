defmodule StorymapWeb.AdminLive.ActivityTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.AdminActivity
  alias Storymap.Repo

  test "mark read updates page unread count", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    conn = log_in_user(conn, admin)
    scope = Scope.for_user(admin)

    {:ok, event} = AdminActivity.record_event("pin_created", admin.id, %{"pin_id" => 1})
    unread_before = AdminActivity.unread_count(scope)

    {:ok, view, _html} = live(conn, ~p"/admin/activity")

    assert has_element?(view, "#admin-activity-page-unread", "Unread: #{unread_before}")

    view
    |> element("#events-#{event.id} button", "Mark read")
    |> render_click()

    assert has_element?(view, "#admin-activity-page-unread", "Unread: #{unread_before - 1}")
  end

  test "content_reported shows audit styling without mark read", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))
    conn = log_in_user(conn, admin)
    scope = Scope.for_user(admin)

    {:ok, event} =
      AdminActivity.record_event("content_reported", nil, %{
        "report_id" => 42,
        "pin_id" => 7,
        "category" => "spam"
      })

    unread = AdminActivity.unread_count(scope)
    {:ok, view, html} = live(conn, ~p"/admin/activity")

    assert has_element?(view, "#admin-activity-page-unread", "Unread: #{unread}")
    assert html =~ "Audit"
    assert html =~ "Content reported"
    refute has_element?(view, "#events-#{event.id} button", "Mark read")
    refute html =~ ~s("report_id")
    assert has_element?(view, "#events-#{event.id}")
  end

  test "mark read/unread toggles immediately and styles card", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    {:ok, event} = AdminActivity.record_event("pin_created", admin.id, %{"pin_id" => 123})

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/activity")

    card_selector = "#events-#{event.id} .rounded-xl"
    assert has_element?(view, card_selector)
    assert has_element?(view, "#events-#{event.id} button", "Mark read")

    view
    |> element("#events-#{event.id} button", "Mark read")
    |> render_click()

    assert has_element?(view, "#events-#{event.id} button", "Mark unread")
    assert render(view) =~ "bg-success/10"

    view
    |> element("#events-#{event.id} button", "Mark unread")
    |> render_click()

    assert has_element?(view, "#events-#{event.id} button", "Mark read")
  end

  test "pin_created shows title line without raw JSON metadata dump", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    unique_title = "UniquePinTitle#{System.unique_integer([:positive])}"

    {:ok, event} =
      AdminActivity.record_event("pin_created", admin.id, %{
        "pin_id" => 999,
        "title" => unique_title
      })

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/activity")

    html = render(view)
    assert html =~ "Pin: #{unique_title}"
    refute html =~ "\"pin_id\""
    assert has_element?(view, "#events-#{event.id}")
  end

  test "mark all read marks listed events read in UI", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    {:ok, e1} = AdminActivity.record_event("pin_created", admin.id, %{"pin_id" => 1})
    {:ok, e2} = AdminActivity.record_event("pin_created", admin.id, %{"pin_id" => 2})

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/activity")

    assert has_element?(view, "#events-#{e1.id} button", "Mark read")
    assert has_element?(view, "#events-#{e2.id} button", "Mark read")

    view
    |> element("#admin-activity-mark-all-read")
    |> render_click()

    assert has_element?(view, "#events-#{e1.id} button", "Mark unread")
    assert has_element?(view, "#events-#{e2.id} button", "Mark unread")
  end

  test "non-admin cannot access activity LiveView", %{conn: conn} do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    conn = log_in_user(conn, user)

    assert {:error, {:redirect, %{to: "/"}}} = live(conn, ~p"/admin/activity")
  end
end
