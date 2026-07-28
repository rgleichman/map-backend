defmodule StorymapWeb.StaticLive.AboutNavTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  test "about page renders secondary nav with About current", %{conn: conn} do
    {:ok, lv, _html} = live(conn, ~p"/about")

    assert has_element?(lv, "#about-secondary-nav")
    assert has_element?(lv, "#about-secondary-nav a[aria-current=page]", "About")
    refute has_element?(lv, "#about-secondary-nav a[aria-current=page]", "Vision")
    refute has_element?(lv, "#about-secondary-nav a[aria-current=page]", "Privacy")
  end

  test "vision page renders secondary nav with Vision current", %{conn: conn} do
    {:ok, lv, _html} = live(conn, ~p"/vision")

    assert has_element?(lv, "#about-secondary-nav a[aria-current=page]", "Vision")
  end

  test "privacy page renders secondary nav with Privacy current", %{conn: conn} do
    {:ok, lv, _html} = live(conn, ~p"/privacy-policy")

    assert has_element?(lv, "#about-secondary-nav a[aria-current=page]", "Privacy")
  end

  test "help page renders secondary nav with Help current", %{conn: conn} do
    {:ok, lv, _html} = live(conn, ~p"/help")

    assert has_element?(lv, "#about-secondary-nav a[aria-current=page]", "Help")
  end
end
