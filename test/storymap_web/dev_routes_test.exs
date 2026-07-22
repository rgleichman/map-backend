defmodule StorymapWeb.DevRoutesTest do
  use StorymapWeb.ConnCase, async: true

  describe "GET /dev/mailbox" do
    test "is reachable without authentication", %{conn: conn} do
      conn = get(conn, "/dev/mailbox")

      # Must not redirect to login (regression from locking /dev behind auth).
      assert html_response(conn, 200)
    end
  end

  describe "GET /dev/dashboard" do
    test "requires authentication", %{conn: conn} do
      conn = get(conn, "/dev/dashboard")

      assert redirected_to(conn) == ~p"/users/log-in"
    end
  end
end
