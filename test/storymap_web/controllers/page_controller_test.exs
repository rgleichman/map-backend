defmodule StorymapWeb.PageControllerTest do
  use StorymapWeb.ConnCase, async: true

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    html = html_response(conn, 200)
    assert html =~ "Map Garden"
    assert html =~ "(beta)"
  end
end
