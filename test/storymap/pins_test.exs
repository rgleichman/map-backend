defmodule Storymap.PinsTest do
  use Storymap.DataCase, async: true

  alias Storymap.Pins

  import Storymap.PinsFixtures
  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

  describe "pins" do
    alias Storymap.Pins.Pin

    @valid_attrs %{
      "title" => "some title",
      "latitude" => 120.5,
      "longitude" => 120.5,
      "pin_type" => "one_time"
    }
    @invalid_attrs %{"title" => nil, "latitude" => nil, "longitude" => nil}

    test "list_pins/0 returns all pins" do
      pin = pin_fixture()
      assert [fetched] = Pins.list_pins()
      assert fetched.id == pin.id
    end

    test "get_pin!/1 returns the pin with given id" do
      pin = pin_fixture()
      assert Pins.get_pin!(pin.id).id == pin.id
    end

    test "create_pin/2 with valid data creates a pin" do
      user = user_fixture()

      assert {:ok, %Pin{} = pin} = Pins.create_pin(@valid_attrs, user.id)
      assert pin.title == "some title"
      assert pin.latitude == 120.5
      assert pin.longitude == 120.5
    end

    test "create_pin/2 with pin_type other clears time and schedule fields" do
      user = user_fixture()

      attrs =
        Map.merge(@valid_attrs, %{
          "pin_type" => "other",
          "start_time" => "2025-01-01T12:00:00Z",
          "end_time" => "2025-01-01T13:00:00Z",
          "schedule_rrule" => "FREQ=WEEKLY;BYDAY=MO"
        })

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert pin.pin_type == "other"
      assert is_nil(pin.start_time)
      assert is_nil(pin.end_time)
      assert is_nil(pin.schedule_rrule)
      assert is_nil(pin.schedule_timezone)
    end

    test "create_pin/2 with invalid data returns error changeset" do
      user = user_fixture()
      assert {:error, %Ecto.Changeset{}} = Pins.create_pin(@invalid_attrs, user.id)
    end

    test "create_pin/2 rejects descriptions longer than 5000 characters" do
      user = user_fixture()
      attrs = Map.put(@valid_attrs, "description", String.duplicate("a", 5001))

      assert {:error, %Ecto.Changeset{} = changeset} = Pins.create_pin(attrs, user.id)
      assert "should be at most 5000 character(s)" in errors_on(changeset).description
    end

    test "update_pin/2 with valid data updates the pin" do
      pin = pin_fixture()
      update_attrs = %{"title" => "some updated title", "latitude" => 456.7, "longitude" => 456.7}

      assert {:ok, %Pin{} = pin} = Pins.update_pin(pin, update_attrs)
      assert pin.title == "some updated title"
      assert pin.latitude == 456.7
      assert pin.longitude == 456.7
    end

    test "update_pin/2 with invalid data returns error changeset" do
      pin = pin_fixture()
      bad_attrs = %{"title" => nil, "latitude" => nil, "longitude" => nil}
      assert {:error, %Ecto.Changeset{}} = Pins.update_pin(pin, bad_attrs)
      assert Pins.get_pin!(pin.id).id == pin.id
    end

    test "update_pin/3 validates sub-map required_tags with atom-key attrs" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{
            "community_url" => "tag-validation",
            "settings" => %{"required_tags" => ["bbq"]}
          },
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other",
            "tags" => ["bbq"]
          }
        )

      assert {:error, %Ecto.Changeset{errors: errors}} =
               Pins.update_pin(pin, %{title: "Renamed", tags: []}, sub_map: sub_map)

      assert {"must include: bbq", _} = Keyword.fetch!(errors, :tags)
    end

    test "delete_pin/1 deletes the pin" do
      pin = pin_fixture()
      assert {:ok, %Pin{}} = Pins.delete_pin(pin)
      assert_raise Ecto.NoResultsError, fn -> Pins.get_pin!(pin.id) end
    end

    test "change_pin/1 returns a pin changeset" do
      pin = pin_fixture()
      assert %Ecto.Changeset{} = Pins.change_pin(pin)
    end

    test "Jason.encode!/1 includes start_time and end_time and never user_id" do
      pin =
        pin_fixture(%{
          "start_time" => "2025-01-01T12:00:00Z",
          "end_time" => "2025-01-01T13:00:00Z"
        })

      pin = Storymap.Repo.get!(Pin, pin.id)

      json = Jason.encode!(pin) |> Jason.decode!()
      assert Map.has_key?(json, "start_time")
      assert Map.has_key?(json, "end_time")
      refute Map.has_key?(json, "user_id")
    end

    test "map_path_for_pin/1 uses community map when pin belongs to a sub-map" do
      owner = user_fixture()
      sub_map = sub_map_fixture(%{"community_url" => "path-test"}, owner)

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          Map.merge(@valid_attrs, %{"pin_type" => "other"})
        )

      pin = Storymap.Repo.preload(pin, :sub_map)
      assert Pins.map_path_for_pin(pin) == "/m/path-test/map?pin=#{pin.id}"
      assert Pins.map_path_for_pin(pin.id) == "/m/path-test/map?pin=#{pin.id}"
    end

    test "map_path_for_pin/1 uses world map for legacy pins" do
      pin = pin_fixture()
      assert Pins.map_path_for_pin(pin) == "/map?pin=#{pin.id}"
    end
  end
end
