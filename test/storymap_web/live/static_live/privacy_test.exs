defmodule StorymapWeb.StaticLive.PrivacyTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  test "renders stub privacy policy page when unauthenticated", %{conn: conn} do
    {:ok, _lv, html} = live(conn, ~p"/privacy-policy")

    assert html =~ "Privacy Policy"
    assert html =~ "Content coming soon."
  end
end
