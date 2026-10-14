defmodule StorymapWeb.SubMapLive.SettingsTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Storymap.SubMapsFixtures

  alias Storymap.PinTypes
  alias Storymap.SubMaps.PinTypeSettings

  setup :register_and_log_in_user

  test "pin type checkbox changes survive validate and save", %{conn: conn, user: user} do
    [keep, drop | _] = PinTypes.list_enabled_pin_types()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "pin-type-settings", "name" => "Pin Type Settings"},
        user
      )

    :ok = PinTypeSettings.replace_enabled_pin_types(sub_map, [keep.id, drop.id])

    {:ok, view, _html} = live(conn, ~p"/g/#{sub_map.community_url}/settings")

    view
    |> form("#sub-map-settings-form", %{
      "sub_map" => %{"name" => "Pin Type Settings"},
      "enabled_pin_type_ids" => [to_string(keep.id)]
    })
    |> render_change()

    assert has_element?(
             view,
             ~s(#community-pin-type-fields input[value="#{keep.id}"][checked])
           )

    refute has_element?(
             view,
             ~s(#community-pin-type-fields input[value="#{drop.id}"][checked])
           )

    view
    |> form("#sub-map-settings-form", %{
      "sub_map" => %{"name" => "Pin Type Settings"},
      "enabled_pin_type_ids" => [to_string(keep.id)]
    })
    |> render_submit()

    assert PinTypeSettings.enabled_pin_type_ids(sub_map) == [keep.id]
  end
end
