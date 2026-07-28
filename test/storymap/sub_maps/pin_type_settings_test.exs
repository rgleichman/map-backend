defmodule Storymap.SubMaps.PinTypeSettingsTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinTypesFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins
  alias Storymap.SubMaps
  alias Storymap.SubMaps.PinTypeSettings

  test "community allowlist blocks types that are not enabled" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "allowlist-test"}, owner)
    pin_type = pin_type_fixture(%{}, owner)
    allowed = pin_type_fixture(%{}, owner)

    {:ok, sub_map} =
      SubMaps.update_pin_type_settings(%Scope{user: owner}, sub_map, %{
        "enabled_pin_type_ids" => [allowed.id]
      })

    assert PinTypeSettings.pin_type_allowed?(sub_map, allowed.id)
    refute PinTypeSettings.pin_type_allowed?(sub_map, pin_type.id)

    assert {:error, changeset} =
             Pins.create_pin(
               %{
                 "title" => "Arcade",
                 "latitude" => 30.0,
                 "longitude" => -97.0,
                 "pin_type" => pin_type.slug,
                 "custom_data" => %{"status" => "working"}
               },
               owner.id,
               sub_map: sub_map
             )

    assert "is not allowed in this community" in errors_on(changeset).pin_type
  end

  test "enabled type can be used in community" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "allowlist-ok"}, owner)
    pin_type = pin_type_fixture(%{}, owner)

    {:ok, sub_map} =
      SubMaps.update_pin_type_settings(%Scope{user: owner}, sub_map, %{
        "enabled_pin_types" => [pin_type.slug]
      })

    assert PinTypeSettings.enabled_pin_type_ids(sub_map) == [pin_type.id]

    assert {:ok, pin} =
             Pins.create_pin(
               %{
                 "title" => "Arcade",
                 "latitude" => 30.0,
                 "longitude" => -97.0,
                 "pin_type" => pin_type.slug,
                 "custom_data" => %{"status" => "working"}
               },
               owner.id,
               sub_map: sub_map
             )

    assert pin.pin_type_id == pin_type.id
  end

  test "replace_enabled_pin_types/2 prunes rows and normalize_settings/1 strips old keys" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "allowlist-replace"}, owner)
    first = pin_type_fixture(%{}, owner)
    second = pin_type_fixture(%{}, owner)

    :ok = PinTypeSettings.replace_enabled_pin_types(sub_map, [first.id, second.id])

    assert Enum.sort(PinTypeSettings.enabled_pin_type_ids(sub_map)) ==
             Enum.sort([first.id, second.id])

    :ok = PinTypeSettings.replace_enabled_pin_types(sub_map, [second.id])
    assert PinTypeSettings.enabled_pin_type_ids(sub_map) == [second.id]

    settings =
      PinTypeSettings.normalize_settings(%{
        "enabled_builtin_pin_types" => ["one_time"],
        "enabled_custom_pin_types" => ["arcade"],
        "allowed_pin_types" => ["other"],
        "require_description" => true
      })

    assert settings == %{"require_description" => true}
  end
end
