defmodule StorymapWeb.SubMapsRoutesTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.SubMapsFixtures

  describe "sub-map discovery routes" do
    test "GET /m renders communities browse", %{conn: conn} do
      conn = get(conn, ~p"/m")
      assert html_response(conn, 200) =~ "Communities"
      assert html_response(conn, 200) =~ ~s(id="sub-maps-empty")
    end

    test "GET /m/:community_url renders community home", %{conn: conn} do
      sub_map = sub_map_fixture(%{"community_url" => "bbq-austin", "name" => "BBQ Austin"})
      conn = get(conn, ~p"/m/#{sub_map.community_url}")
      assert html_response(conn, 200) =~ "BBQ Austin"
    end

    test "GET /m/:community_url/map renders react root with community url", %{conn: conn} do
      conn = get(conn, ~p"/m/bbq-austin/map")
      html = html_response(conn, 200)
      assert html =~ ~s(id="react-root")
      assert html =~ ~s(data-community-url="bbq-austin")
    end

    test "GET /m/design renders design summary", %{conn: conn} do
      conn = get(conn, ~p"/m/design")
      assert html_response(conn, 200) =~ "Sub-maps design"
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
  end
end
