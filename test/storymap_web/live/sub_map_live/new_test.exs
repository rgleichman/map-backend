defmodule StorymapWeb.SubMapLive.NewTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.PinTypes
  alias Storymap.SubMaps
  alias Storymap.SubMaps.PinTypeSettings

  setup :register_and_log_in_user

  test "selected default pin types survive validate and create", %{conn: conn, user: user} do
    [first, second | _] = PinTypes.list_enabled_pin_types()

    {:ok, view, _html} = live(conn, ~p"/g/new")

    community_url = "new-pin-types-#{System.unique_integer([:positive])}"

    view
    |> form("#sub-map-create-form", %{
      "sub_map" => %{
        "name" => "New Garden",
        "community_url" => community_url,
        "contribution_mode" => "open",
        "promote_to_world_default" => "ask"
      },
      "enabled_pin_type_ids" => [to_string(first.id), to_string(second.id)]
    })
    |> render_change()

    assert has_element?(
             view,
             ~s(#community-pin-type-fields input[value="#{first.id}"][checked])
           )

    assert has_element?(
             view,
             ~s(#community-pin-type-fields input[value="#{second.id}"][checked])
           )

    view
    |> form("#sub-map-create-form", %{
      "sub_map" => %{
        "name" => "New Garden",
        "community_url" => community_url,
        "contribution_mode" => "open",
        "promote_to_world_default" => "ask"
      },
      "enabled_pin_type_ids" => [to_string(first.id), to_string(second.id)]
    })
    |> render_submit()

    assert_redirect(view, ~p"/g/#{community_url}/map")

    sub_map = SubMaps.get_by_community_url!(community_url)

    assert Enum.sort(PinTypeSettings.enabled_pin_type_ids(sub_map)) ==
             Enum.sort([first.id, second.id])

    assert sub_map.owner_user_id == user.id
  end
end
