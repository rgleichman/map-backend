defmodule StorymapWeb.SavedLive.IndexTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.PinsFixtures

  setup :register_and_log_in_user

  test "renders empty state", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/saved")
    assert has_element?(view, "h1", "Clippings")
    assert render(view) =~ "You have not taken any clippings yet"
  end

  test "lists saved pins", %{conn: conn, user: user} do
    pin = pin_fixture(%{"title" => "My favorite spot"}, user)
    pin_heart_fixture(user, pin)

    {:ok, view, _html} = live(conn, ~p"/saved")

    assert has_element?(
             view,
             "#saved-pin-#{pin.id} a[href='/map?pin=#{pin.id}']",
             "My favorite spot"
           )
  end

  test "requires authentication", %{conn: conn} do
    conn = recycle(conn) |> delete_req_header("authorization")
    assert {:error, {:redirect, %{to: to}}} = live(conn, ~p"/saved")
    uri = URI.parse(to)
    assert uri.path == "/users/log-in"
    assert URI.decode_query(uri.query || "")["return_to"] == "/saved"
  end

  test "live navigation to /saved redirects to login with return_to", %{conn: conn} do
    conn = recycle(conn) |> delete_req_header("authorization")
    {:ok, view, _html} = live(conn, ~p"/")

    assert {:error, redirect} = live_redirect(view, to: ~p"/saved")
    to = login_redirect_to(redirect)
    uri = URI.parse(to)
    assert uri.path == "/users/log-in"
    assert URI.decode_query(uri.query || "")["return_to"] == "/saved"
  end

  test "stores return_to and redirects back after login", %{user: user} do
    conn = get(build_conn(), ~p"/saved")
    assert redirected_to(conn) =~ "/users/log-in"
    assert get_session(conn, :user_return_to) == "/saved"

    {token, _hashed} = Storymap.AccountsFixtures.generate_user_magic_link_token(user)

    conn = post(conn, ~p"/users/log-in", %{"user" => %{"token" => token}})
    assert redirected_to(conn) == "/saved"
  end

  test "redirects muted user", %{conn: conn, user: user} do
    import Storymap.AccountsFixtures

    pin = pin_fixture(%{"title" => "Saved before mute"}, user)
    pin_heart_fixture(user, pin)
    user = muted_user_fixture(user)
    conn = log_in_user(conn, user)

    assert {:error, {:live_redirect, %{to: "/", flash: flash}}} = live(conn, ~p"/saved")
    assert %{"error" => "Your account is muted."} = flash
  end

  defp login_redirect_to({:redirect, %{to: to}}), do: to
  defp login_redirect_to({:live_redirect, %{to: to}}), do: to
end
