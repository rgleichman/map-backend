defmodule StorymapWeb.StaticLive.PrivacyTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  test "renders privacy policy page when unauthenticated", %{conn: conn} do
    {:ok, lv, _html} = live(conn, ~p"/privacy-policy")

    assert has_element?(lv, "h1", "Privacy Policy")
    assert has_element?(lv, "#privacy-summary", "Summary")
  end
end
