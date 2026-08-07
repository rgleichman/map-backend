defmodule StorymapWeb.ContributionsLive.IndexTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.PinsFixtures

  setup :register_and_log_in_user

  test "renders empty state", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/contributions")
    assert has_element?(view, "h1", "My contributions")
    assert render(view) =~ "You have not created any pins yet"
  end

  test "lists contributed pins with status", %{conn: conn, user: user} do
    pin = pin_fixture(%{"title" => "My contribution"}, user)

    {:ok, view, _html} = live(conn, ~p"/contributions")

    assert has_element?(
             view,
             "#contribution-pin-#{pin.id} a[href='/map?pin=#{pin.id}']",
             "My contribution"
           )

    assert has_element?(view, "#contribution-pin-#{pin.id} .badge", "Approved")
  end

  test "requires authentication", %{conn: conn} do
    conn = recycle(conn) |> delete_req_header("authorization")
    assert {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/contributions")
  end
end
