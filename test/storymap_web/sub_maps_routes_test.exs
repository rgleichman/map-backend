defmodule StorymapWeb.SubMapsRoutesTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.SubMapsFixtures

  describe "garden discovery routes" do
    test "GET /g renders communities browse", %{conn: conn} do
      conn = get(conn, ~p"/g")
      assert html_response(conn, 200) =~ "Gardens"
      assert html_response(conn, 200) =~ ~s(id="sub-maps-empty")
    end

    test "GET /g/:community_url redirects to garden map", %{conn: conn} do
      sub_map = sub_map_fixture(%{"community_url" => "bbq-austin", "name" => "BBQ Austin"})
      conn = get(conn, ~p"/g/#{sub_map.community_url}")
      assert redirected_to(conn) == ~p"/g/#{sub_map.community_url}/map"
    end

    test "GET /g/:community_url/map renders react root with community url", %{conn: conn} do
      conn = get(conn, ~p"/g/bbq-austin/map")
      html = html_response(conn, 200)
      assert html =~ ~s(id="react-root")
      assert html =~ ~s(data-community-url="bbq-austin")
    end

    test "GET /g/:community_url/map includes site footer links", %{conn: conn} do
      conn = get(conn, ~p"/g/bbq-austin/map")
      html = html_response(conn, 200)
      assert html =~ ~s(data-footer-path="/help")
      assert html =~ "Help"
      assert html =~ ~s(data-desktop-footer)
      assert html =~ "--map-pin-legend-max-width"
    end

    test "GET /g includes create community action", %{conn: conn} do
      conn = get(conn, ~p"/g")
      assert html_response(conn, 200) =~ ~s(id="sub-maps-create")
    end
  end

  describe "legacy /m garden redirects" do
    test "GET /m redirects to /g", %{conn: conn} do
      conn = get(conn, "/m")
      assert redirected_to(conn, 301) == "/g"
    end

    test "GET /m/:community_url/map?pin= redirects to /g with query", %{conn: conn} do
      conn = get(conn, "/m/bbq-austin/map?pin=12")
      assert redirected_to(conn, 301) == "/g/bbq-austin/map?pin=12"
    end

    test "GET /m/new redirects to /g/new", %{conn: conn} do
      conn = get(conn, "/m/new")
      assert redirected_to(conn, 301) == "/g/new"
    end
  end

  describe "authenticated garden routes" do
    setup :register_and_log_in_user

    test "GET /g/new renders create placeholder", %{conn: conn} do
      conn = get(conn, ~p"/g/new")
      assert html_response(conn, 200) =~ "Create a garden"
    end

    test "GET /g/:community_url/admin renders moderation placeholder", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "bbq-mod"}, user)
      conn = get(conn, ~p"/g/#{sub_map.community_url}/admin")
      assert html_response(conn, 200) =~ "Moderation"
    end

    test "GET /g/:community_url/settings renders edit form for owner", %{conn: conn, user: user} do
      sub_map =
        sub_map_fixture(%{"community_url" => "settings-test", "name" => "Settings Map"}, user)

      conn = get(conn, ~p"/g/#{sub_map.community_url}/settings")
      html = html_response(conn, 200)
      assert html =~ "Garden settings"
      assert html =~ ~s(id="sub-map-settings-form")
      assert html =~ ~s(id="community-color-field")
      assert html =~ ~s(id="sub_map_color")
      assert html =~ ~s(id="community-pin-type-fields")
    end

    test "GET /g/new includes pin type fields", %{conn: conn} do
      conn = get(conn, ~p"/g/new")
      html = html_response(conn, 200)
      assert html =~ ~s(id="community-pin-type-fields")
      assert html =~ ~s(id="community-color-field")
      assert html =~ ~s(id="sub_map_color")
    end

    test "GET /g/:community_url/settings redirects non-owner", %{conn: conn} do
      sub_map = sub_map_fixture(%{"community_url" => "settings-deny"})
      conn = get(conn, ~p"/g/#{sub_map.community_url}/settings")
      assert redirected_to(conn) == ~p"/g/#{sub_map.community_url}/map"
    end
  end
end
