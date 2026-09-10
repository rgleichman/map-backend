defmodule StorymapWeb.UserLive.ShowTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

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

  test "shows contributions section on own profile", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)

    pin = pin_fixture(%{"title" => "Created cafe"}, user)

    {:ok, view, _html} = live(conn, ~p"/user/#{user.id}")
    assert has_element?(view, "h2", "My contributions")
    assert has_element?(view, "#profile-contribution-pin-#{pin.id}", "Created cafe")
    assert has_element?(view, "#profile-contribution-pin-#{pin.id} .badge", "Approved")
    assert has_element?(view, "a[href='/contributions']", "See all (1)")
  end

  test "shows communities section on own profile", %{conn: conn} do
    user = user_fixture()
    other = user_fixture()
    conn = log_in_user(conn, user)

    owned =
      sub_map_fixture(%{"community_url" => "profile-owned", "name" => "Profile Owned"}, user)

    joined =
      sub_map_fixture(%{"community_url" => "profile-joined", "name" => "Profile Joined"}, other)

    {:ok, _} = SubMaps.join(%Scope{user: user}, joined)

    {:ok, view, html} = live(conn, ~p"/user/#{user.id}")
    assert has_element?(view, "h2", "Communities")
    assert has_element?(view, "#profile-community-#{owned.id}", "Profile Owned")
    assert has_element?(view, "#profile-community-#{joined.id}", "Profile Joined")
    assert has_element?(view, "a[href='/m']", "See all (2)")
    assert html =~ "Only you can see this list"
  end

  test "does not show saved pins on another user's profile", %{conn: conn} do
    viewer = user_fixture()
    other = user_fixture()
    conn = log_in_user(conn, viewer)

    pin = pin_fixture(%{"title" => "Secret save"}, other)
    pin_heart_fixture(other, pin)

    secret_community =
      sub_map_fixture(%{"community_url" => "secret-comm", "name" => "Secret Community"}, other)

    {:ok, view, html} = live(conn, ~p"/user/#{other.id}")
    refute has_element?(view, "h2", "Communities")
    refute has_element?(view, "h2", "Saved pins")
    refute has_element?(view, "h2", "My contributions")
    refute html =~ "Secret save"
    refute html =~ "Secret Community"
    refute has_element?(view, "#profile-community-#{secret_community.id}")
  end

  test "own profile empty saved state", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)

    {:ok, view, html} = live(conn, ~p"/user/#{user.id}")
    assert html =~ "You have not saved any pins yet"
    assert html =~ "You have not created any pins yet"
    assert html =~ "You have not joined any communities yet"
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
    refute has_element?(view, "#profile-saved-pin-#{pin.id}")
    # Contributions still list pins the user created (mute blocks hearts, not ownership).
    assert has_element?(view, "h2", "My contributions")
    assert has_element?(view, "#profile-contribution-pin-#{pin.id}", "Saved before mute")
  end
end
