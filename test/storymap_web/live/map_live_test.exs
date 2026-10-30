defmodule StorymapWeb.MapLiveTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.SubMapsFixtures

  test "GET / renders map host without overlay", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/")

    assert html =~ ~s(id="react-root")
    assert html =~ "Map Garden"
    assert html =~ "(beta)"
    refute has_element?(view, "#content-overlay")
    assert has_element?(view, "#map-live-bridge")
  end

  test "GET /about renders overlay over the persistent map root", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/about")

    assert html =~ ~s(id="react-root")
    assert has_element?(view, "#content-overlay")
    assert has_element?(view, "#content-overlay-close")
    assert has_element?(view, "#content-overlay-close[data-back-to-map]")
    assert has_element?(view, "#content-overlay [data-overlay-backdrop]")
    assert html =~ "pointer-events-none relative z-10"
    assert html =~ "pointer-events-auto relative mx-auto"
    assert render(view) =~ "About Map Garden"
  end

  test "overlay close navigates to the map", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/about")

    assert {:error, {:live_redirect, %{to: to}}} =
             view |> element("#content-overlay-close") |> render_click()

    assert to == ~p"/"
  end

  test "GET /g/:community_url/map sets data-community-url on react root", %{conn: conn} do
    html = html_response(get(conn, ~p"/g/bbq-austin/map"), 200)
    assert html =~ ~s(id="react-root")
    assert html =~ ~s(data-community-url="bbq-austin")
    refute html =~ ~s(id="content-overlay")
  end

  test "unknown garden map stays 200", %{conn: conn} do
    conn = get(conn, ~p"/g/nope/map")
    assert html_response(conn, 200) =~ ~s(id="react-root")
  end

  test "GET /g/:community_url redirects to garden map", %{conn: conn} do
    sub_map = sub_map_fixture(%{"community_url" => "bbq-show", "name" => "BBQ Show"})
    conn = get(conn, ~p"/g/#{sub_map.community_url}")
    assert redirected_to(conn) == ~p"/g/#{sub_map.community_url}/map"
  end
end
