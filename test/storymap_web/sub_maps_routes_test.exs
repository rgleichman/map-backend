defmodule StorymapWeb.SubMapsRoutesTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.SubMapsFixtures

  describe "sub-map discovery routes" do
    test "GET /m renders communities browse", %{conn: conn} do
      conn = get(conn, ~p"/m")
      assert html_response(conn, 200) =~ "Communities"
      assert html_response(conn, 200) =~ ~s(id="sub-maps-empty")
    end

    test "GET /m/:community_url redirects to community map", %{conn: conn} do
      sub_map = sub_map_fixture(%{"community_url" => "bbq-austin", "name" => "BBQ Austin"})
      conn = get(conn, ~p"/m/#{sub_map.community_url}")
      assert redirected_to(conn) == ~p"/m/#{sub_map.community_url}/map"
    end

    test "GET /m/:community_url/map renders react root with community url", %{conn: conn} do
      conn = get(conn, ~p"/m/bbq-austin/map")
      html = html_response(conn, 200)
      assert html =~ ~s(id="react-root")
      assert html =~ ~s(data-community-url="bbq-austin")
    end

    test "GET /m/:community_url/map includes site footer links", %{conn: conn} do
      conn = get(conn, ~p"/m/bbq-austin/map")
      html = html_response(conn, 200)
      assert html =~ ~s(data-footer-path="/help")
      assert html =~ "Help"
    end

    test "GET /m includes create community action", %{conn: conn} do
      conn = get(conn, ~p"/m")
      assert html_response(conn, 200) =~ ~s(id="sub-maps-create")
    end
  end

  describe "authenticated sub-map routes" do
    setup :register_and_log_in_user

    test "GET /m/new renders create placeholder", %{conn: conn} do
      conn = get(conn, ~p"/m/new")
      assert html_response(conn, 200) =~ "Create a community"
    end

    test "GET /m/:community_url/admin renders moderation placeholder", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "bbq-mod"}, user)
      conn = get(conn, ~p"/m/#{sub_map.community_url}/admin")
      assert html_response(conn, 200) =~ "Moderation"
    end

    test "GET /m/:community_url/settings renders edit form for owner", %{conn: conn, user: user} do
      sub_map =
        sub_map_fixture(%{"community_url" => "settings-test", "name" => "Settings Map"}, user)

      conn = get(conn, ~p"/m/#{sub_map.community_url}/settings")
      html = html_response(conn, 200)
      assert html =~ "Community settings"
      assert html =~ ~s(id="sub-map-settings-form")
    end

    test "GET /m/:community_url/settings redirects non-owner", %{conn: conn} do
      sub_map = sub_map_fixture(%{"community_url" => "settings-deny"})
      conn = get(conn, ~p"/m/#{sub_map.community_url}/settings")
      assert redirected_to(conn) == ~p"/m/#{sub_map.community_url}/map"
    end
  end
end
