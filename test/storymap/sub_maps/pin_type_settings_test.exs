defmodule Storymap.SubMaps.PinTypeSettingsTest do
  use Storymap.DataCase

  import Storymap.AccountsFixtures
  import Storymap.PinTypesFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins
  alias Storymap.PinTypes.CustomPinType
  alias Storymap.SubMaps
  alias Storymap.SubMaps.PinTypeSettings

  test "community allowlist blocks disallowed custom types" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "allowlist-test"}, owner)
    pin_type = custom_pin_type_fixture(%{}, owner)

    {:ok, sub_map} =
      SubMaps.update_pin_type_settings(%Scope{user: owner}, sub_map, %{
        "enabled_builtin_pin_types" => ["other"],
        "enabled_custom_pin_types" => []
      })

    assert PinTypeSettings.pin_type_allowed?(sub_map.settings, "other")

    refute PinTypeSettings.pin_type_allowed?(
             sub_map.settings,
             CustomPinType.pin_type_value(pin_type)
           )

    assert {:error, changeset} =
             Pins.create_pin(
               %{
                 "title" => "Arcade",
                 "latitude" => 30.0,
                 "longitude" => -97.0,
                 "pin_type" => CustomPinType.pin_type_value(pin_type),
                 "custom_data" => %{"status" => "working"},
                 "sub_map_id" => sub_map.id
               },
               owner.id,
               sub_map: sub_map
             )

    assert "is not allowed in this community" in errors_on(changeset).pin_type
  end

  test "enabled custom type can be used in community" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "allowlist-ok"}, owner)
    pin_type = custom_pin_type_fixture(%{}, owner)

    {:ok, sub_map} =
      SubMaps.update_pin_type_settings(%Scope{user: owner}, sub_map, %{
        "enabled_builtin_pin_types" => [],
        "enabled_custom_pin_types" => [pin_type.slug]
      })

    assert {:ok, pin} =
             Pins.create_pin(
               %{
                 "title" => "Arcade",
                 "latitude" => 30.0,
                 "longitude" => -97.0,
                 "pin_type" => CustomPinType.pin_type_value(pin_type),
                 "custom_data" => %{"status" => "working"},
                 "sub_map_id" => sub_map.id
               },
               owner.id,
               sub_map: sub_map
             )

    assert pin.pin_type == "custom:#{pin_type.slug}"
  end
end
