defmodule StorymapWeb.AdminLive.UsersTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.AccountsFixtures
  alias Storymap.PinsFixtures
  alias Storymap.Repo

  test "non-admin cannot access admin dashboard", %{conn: conn} do
    user = AccountsFixtures.user_fixture()
    user = Repo.update!(Ecto.Changeset.change(user, admin_level: 0))

    conn = log_in_user(conn, user)

    assert {:error, {:redirect, %{to: "/"}}} = live(conn, ~p"/admin/users")
  end

  test "admin can view users and update admin_level", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    target = AccountsFixtures.user_fixture()
    target = Repo.update!(Ecto.Changeset.change(target, admin_level: 0))

    conn = log_in_user(conn, admin)

    {:ok, view, _html} = live(conn, ~p"/admin/users")

    assert has_element?(view, "#admin-users")
    assert has_element?(view, "tr", "##{target.id}")

    form_id = "#admin-level-form-#{target.id}"

    view
    |> form(form_id, %{user: %{admin_level: "7"}, _id: "#{target.id}"})
    |> render_submit()

    assert has_element?(view, "tr#users-#{target.id}", "##{target.id}")
  end

  test "admin can mute and unmute a user", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    target = AccountsFixtures.user_fixture()

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/users")

    assert has_element?(view, "tr#users-#{target.id}")
    assert has_element?(view, "tr#users-#{target.id} .badge", "No")

    view
    |> element("tr#users-#{target.id} button[phx-value-muted='true']")
    |> render_click()

    assert has_element?(view, "tr#users-#{target.id} .badge", "Muted")

    view
    |> element("tr#users-#{target.id} button[phx-value-muted='false']")
    |> render_click()

    assert has_element?(view, "tr#users-#{target.id} .badge", "No")
  end

  test "admin can expand a user row to view that user's pins", %{conn: conn} do
    admin = AccountsFixtures.user_fixture()
    admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 10))

    target = AccountsFixtures.user_fixture()
    pin1 = PinsFixtures.pin_fixture(%{title: "Pin one", description: "first line"}, target)

    pin2 =
      PinsFixtures.pin_fixture(
        %{title: "Pin two", description: "second line\nmore details for moderation"},
        target
      )

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/users")

    refute has_element?(view, "#users-#{target.id}-pins")

    view
    |> element("tr#users-#{target.id} button[phx-click='toggle_user_pins']")
    |> render_click()

    assert has_element?(view, "#users-#{target.id}-pins", "Pins by user ##{target.id}")
    assert has_element?(view, "#users-#{target.id}-pins", "Pin one")
    assert has_element?(view, "#users-#{target.id}-pins", "Pin two")

    assert has_element?(view, "#users-#{target.id}-pins", "second line")
    assert has_element?(view, "#users-#{target.id}-pins", "more details for moderation")

    assert has_element?(view, "#users-#{target.id}-pins a[href='/?pin=#{pin1.id}']")
    assert has_element?(view, "#users-#{target.id}-pins a[href='/?pin=#{pin2.id}']")
  end
end
