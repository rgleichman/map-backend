defmodule StorymapWeb.UserLive.ShowTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  test "shows saved pins section on own profile", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)

    pin = pin_fixture(%{"title" => "Saved cafe"}, user)
    pin_heart_fixture(user, pin)

    {:ok, view, _html} = live(conn, ~p"/user/#{user.id}")
    assert has_element?(view, "h2", "Saved pins")
    assert has_element?(view, "#profile-saved-pin-#{pin.id}", "Saved cafe")
    assert has_element?(view, "a", "See all (1)")
    assert has_element?(view, "a[href='/map?pin=#{pin.id}']")
  end

  test "does not show saved pins on another user's profile", %{conn: conn} do
    viewer = user_fixture()
    other = user_fixture()
    conn = log_in_user(conn, viewer)

    pin = pin_fixture(%{"title" => "Secret save"}, other)
    pin_heart_fixture(other, pin)

    {:ok, _view, html} = live(conn, ~p"/user/#{other.id}")
    refute html =~ "Saved pins"
    refute html =~ "Secret save"
  end

  test "own profile empty saved state", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)

    {:ok, view, html} = live(conn, ~p"/user/#{user.id}")
    assert html =~ "You have not saved any pins yet"
    refute has_element?(view, "a", "See all")
  end

  test "muted user sees empty saved section on own profile", %{conn: conn} do
    user = user_fixture()
    pin = pin_fixture(%{"title" => "Saved before mute"}, user)
    pin_heart_fixture(user, pin)
    user = muted_user_fixture(user)
    conn = log_in_user(conn, user)

    {:ok, view, html} = live(conn, ~p"/user/#{user.id}")
    assert has_element?(view, "h2", "Saved pins")
    assert html =~ "You have not saved any pins yet"
    refute has_element?(view, "a", "See all")
    refute html =~ "Saved before mute"
  end
end
