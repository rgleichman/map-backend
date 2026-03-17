defmodule StorymapWeb.AdminLive.UsersTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.AccountsFixtures
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
    assert has_element?(view, "tr", target.email)

    form_id = "#admin-level-form-#{target.id}"

    view
    |> form(form_id, %{user: %{admin_level: "7"}, _id: "#{target.id}"})
    |> render_submit()

    assert has_element?(view, "tr#users-#{target.id}", target.email)
  end
end
