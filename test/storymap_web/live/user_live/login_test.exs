defmodule StorymapWeb.UserLive.LoginTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.AccountsFixtures

  alias Storymap.Accounts

  describe "login page" do
    test "renders login page", %{conn: conn} do
      {:ok, _lv, html} = live(conn, ~p"/users/log-in")

      assert html =~ "Sign in or create an account"
      assert html =~ "Happy Planting!"
      assert html =~ "Please remember your email"
      assert html =~ "cannot recover your account"
      assert html =~ "Continue with email"
      refute html =~ "Register"
      refute html =~ "Sign up"
    end
  end

  describe "user login - magic link" do
    test "sends magic link email when user exists", %{conn: conn} do
      user = user_fixture()

      {:ok, lv, _html} = live(conn, ~p"/users/log-in")

      {:ok, _lv, html} =
        form(lv, "#login_form_magic", user: %{email: registered_email(user)})
        |> render_submit()
        |> follow_redirect(conn, ~p"/users/log-in")

      assert html =~
               "Email sent. Please check your inbox for a link to log in or create an account."

      assert Storymap.Repo.get_by!(Storymap.Accounts.UserToken, user_id: user.id).context ==
               "login"
    end

    test "registers and sends magic link for unknown email", %{conn: conn} do
      email = unique_user_email()

      {:ok, lv, _html} = live(conn, ~p"/users/log-in")

      {:ok, _lv, html} =
        form(lv, "#login_form_magic", user: %{email: email})
        |> render_submit()
        |> follow_redirect(conn, ~p"/users/log-in")

      assert html =~
               "Email sent. Please check your inbox for a link to log in or create an account."

      assert Accounts.get_user_by_email(email)

      user = Accounts.get_user_by_email(email)

      assert Storymap.Repo.get_by!(Storymap.Accounts.UserToken, user_id: user.id).context ==
               "login"
    end

    test "renders errors for invalid email", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/log-in")

      html =
        form(lv, "#login_form_magic", user: %{email: "not valid"})
        |> render_submit()

      assert html =~ "must have the @ sign and no spaces"
    end
  end

  describe "re-authentication (sudo mode)" do
    setup %{conn: conn} do
      user = user_fixture()
      %{user: user, conn: log_in_user(conn, user)}
    end

    test "shows login page for sudo (email not stored; field starts empty)", %{conn: conn} do
      {:ok, _lv, html} = live(conn, ~p"/users/log-in")

      assert html =~ "Sign in again"
      refute html =~ "Sign in or create an account"
      assert html =~ "You need to reauthenticate"
      refute html =~ "Happy Planting!"
      assert html =~ "Please remember your email"
      assert html =~ "Continue with email"

      assert html =~ ~s(id="login_form_magic_email" value="")
    end

    test "does not register a new account when reauthenticating with an unknown email", %{
      conn: conn
    } do
      unknown_email = unique_user_email()
      refute Accounts.get_user_by_email(unknown_email)

      {:ok, lv, _html} = live(conn, ~p"/users/log-in")

      form(lv, "#login_form_magic", user: %{email: unknown_email})
      |> render_submit()

      refute Accounts.get_user_by_email(unknown_email)
    end
  end
end
