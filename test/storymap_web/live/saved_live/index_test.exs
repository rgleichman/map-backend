defmodule StorymapWeb.SavedLive.IndexTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.PinsFixtures

  setup :register_and_log_in_user

  test "renders empty state", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/saved")
    assert has_element?(view, "h1", "Saved pins")
    assert render(view) =~ "You have not saved any pins yet"
  end

  test "lists saved pins", %{conn: conn, user: user} do
    pin = pin_fixture(%{"title" => "My favorite spot"}, user)
    pin_heart_fixture(user, pin)

    {:ok, view, _html} = live(conn, ~p"/saved")

    assert has_element?(
             view,
             "#saved-pin-#{pin.id} a[href='/map?pin=#{pin.id}']",
             "My favorite spot"
           )
  end

  test "requires authentication", %{conn: conn} do
    conn = recycle(conn) |> delete_req_header("authorization")
    assert {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/saved")
  end

  test "redirects muted user", %{conn: conn, user: user} do
    import Storymap.AccountsFixtures

    pin = pin_fixture(%{"title" => "Saved before mute"}, user)
    pin_heart_fixture(user, pin)
    user = muted_user_fixture(user)
    conn = log_in_user(conn, user)

    assert {:error, {:live_redirect, %{to: "/", flash: flash}}} = live(conn, ~p"/saved")
    assert %{"error" => "Your account is muted."} = flash
  end
end
