defmodule Storymap.Pins.QueryTest do
  use Storymap.DataCase

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins
  alias Storymap.SubMaps

  test "world_pins excludes non-promoted sub-map pins" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

    {:ok, _} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Hidden",
          "latitude" => 1.0,
          "longitude" => 1.0,
          "pin_type" => "other"
        }
      )

    world = Pins.list_pins()
    refute Enum.any?(world, &(&1.title == "Hidden"))
  end

  test "legacy pins remain on world map" do
    pin = pin_fixture()
    assert pin.id in Enum.map(Pins.list_pins(), & &1.id)
  end
end
