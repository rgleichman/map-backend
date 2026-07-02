defmodule StorymapWeb.SavedLive.IndexTest do
  use StorymapWeb.ConnCase

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
    {:ok, _} = Storymap.Pins.Hearts.heart(user, pin)

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
end
