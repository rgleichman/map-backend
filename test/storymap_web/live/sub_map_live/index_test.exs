defmodule StorymapWeb.SubMapLive.IndexTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

  test "guest does not see Your communities section", %{conn: conn} do
    sub_map_fixture(%{"community_url" => "guest-browse", "name" => "Guest Browse"})

    {:ok, view, html} = live(conn, ~p"/m")
    refute has_element?(view, "#my-communities")
    refute html =~ "Your communities"
    assert has_element?(view, "#sub-maps-list")
    assert html =~ "Guest Browse"
  end

  test "signed-in user sees private Your communities including unlisted", %{conn: conn} do
    user = user_fixture()
    other = user_fixture()
    conn = log_in_user(conn, user)

    owned =
      sub_map_fixture(
        %{"community_url" => "my-unlisted", "name" => "My Unlisted", "visibility" => "unlisted"},
        user
      )

    public =
      sub_map_fixture(%{"community_url" => "other-public", "name" => "Other Public"}, other)

    {:ok, _} = SubMaps.join(%Scope{user: user}, public)

    {:ok, view, html} = live(conn, ~p"/m")

    assert has_element?(view, "#my-communities", "Your communities")
    assert has_element?(view, "#my-community-#{owned.id}", "My Unlisted")
    assert has_element?(view, "#my-community-#{public.id}", "Other Public")
    assert html =~ "Only you can see this list"

    refute has_element?(view, "#sub-maps-list", "My Unlisted")
    assert has_element?(view, "#sub-maps-list", "Other Public")
  end
end
