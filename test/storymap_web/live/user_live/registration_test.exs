defmodule StorymapWeb.UserLive.RegistrationTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.AccountsFixtures

  describe "Registration page" do
    test "redirects unauthenticated users to log in", %{conn: conn} do
      assert {:ok, _conn} =
               conn
               |> live(~p"/users/register")
               |> follow_redirect(conn, ~p"/users/log-in")
    end

    test "redirects if already logged in", %{conn: conn} do
      result =
        conn
        |> log_in_user(user_fixture())
        |> live(~p"/users/register")
        |> follow_redirect(conn, ~p"/")

      assert {:ok, _conn} = result
    end
  end
end
