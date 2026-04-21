defmodule StorymapWeb.PageControllerTest do
  use StorymapWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    html = html_response(conn, 200)
    assert html =~ "Mapgarden"
    assert html =~ "(beta)"
  end
end
