defmodule Storymap.PinsTest do
  use Storymap.DataCase, async: true

  import Ecto.Query

  alias Storymap.Pins

  import Storymap.PinsFixtures
  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures
  import Storymap.PinTypesFixtures

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
      assert pin.pin_type.slug == "one_time"
    end

    test "create_pin/2 with time_mode none clears time and schedule fields" do
      user = user_fixture()
      pin_type = pin_type_fixture(%{"time_mode" => "none", "schema" => %{"fields" => []}}, user)

      attrs =
        @valid_attrs
        |> Map.drop(["pin_type"])
        |> Map.merge(%{
          "pin_type_id" => pin_type.id,
          "start_time" => "2025-01-01T12:00:00Z",
          "end_time" => "2025-01-01T13:00:00Z",
          "schedule_rrule" => "FREQ=WEEKLY;BYDAY=MO"
        })

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert pin.pin_type.slug == pin_type.slug
      assert is_nil(pin.start_time)
      assert is_nil(pin.end_time)
      assert is_nil(pin.schedule_rrule)
      assert is_nil(pin.schedule_timezone)
    end

    test "create_pin/2 with custom time_mode none clears schedule fields" do
      user = user_fixture()
      pin_type = pin_type_fixture(%{"time_mode" => "none"}, user)

      attrs =
        Map.merge(@valid_attrs, %{
          "pin_type" => "#{pin_type.slug}",
          "custom_data" => %{"status" => "working"},
          "start_time" => "2025-01-01T12:00:00Z",
          "end_time" => "2025-01-01T13:00:00Z",
          "schedule_rrule" => "FREQ=WEEKLY;BYDAY=MO"
        })

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert is_nil(pin.start_time)
      assert is_nil(pin.end_time)
      assert is_nil(pin.schedule_rrule)
      assert is_nil(pin.schedule_timezone)
    end

    test "create_pin/2 with custom time_mode one_time keeps times and clears rrule" do
      user = user_fixture()
      pin_type = pin_type_fixture(%{"time_mode" => "one_time"}, user)

      attrs =
        Map.merge(@valid_attrs, %{
          "latitude" => 30.27,
          "longitude" => -97.74,
          "pin_type" => "#{pin_type.slug}",
          "custom_data" => %{"status" => "working"},
          "start_time" => "2026-08-01T12:00:00Z",
          "end_time" => "2026-08-01T13:00:00Z",
          "schedule_rrule" => "FREQ=WEEKLY;BYDAY=MO"
        })

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert pin.start_time
      assert pin.end_time
      assert is_nil(pin.schedule_rrule)
      assert pin.schedule_timezone
    end

    test "create_pin/2 with custom time_mode hours keeps schedule fields" do
      user = user_fixture()
      pin_type = pin_type_fixture(%{"time_mode" => "hours"}, user)

      attrs =
        Map.merge(@valid_attrs, %{
          "latitude" => 30.27,
          "longitude" => -97.74,
          "pin_type" => "#{pin_type.slug}",
          "custom_data" => %{"status" => "working"},
          "start_time" => "2000-01-01T09:00:00Z",
          "end_time" => "2000-01-01T17:00:00Z",
          "schedule_rrule" => "FREQ=WEEKLY;BYDAY=MO,WE,FR"
        })

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert pin.start_time
      assert pin.end_time
      assert pin.schedule_rrule == "FREQ=WEEKLY;BYDAY=MO,WE,FR"
      assert pin.schedule_timezone
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

    test "create_pin/2 holds flagged title as pending" do
      user = user_fixture()
      attrs = Map.put(@valid_attrs, "title", "contains zzhatephrase here")

      assert {:ok, %Pin{} = pin} = Pins.create_pin(attrs, user.id)
      assert pin.status == :pending
      assert pin.held_for_moderation == true
    end

    test "update_pin/2 holds flagged description as pending" do
      pin = pin_fixture()
      assert pin.status == :approved

      assert {:ok, %Pin{} = updated} =
               Pins.update_pin(pin, %{"description" => "please avoid zzhatephrase"})

      assert updated.status == :pending
      assert updated.held_for_moderation == true
    end

    test "create_pin rejects forged required blob refs without a blob row" do
      user = user_fixture()

      pin_type =
        pin_type_fixture(
          %{
            "schema" => %{
              "fields" => [
                %{"key" => "song", "label" => "Song", "type" => "music", "required" => true}
              ]
            }
          },
          user
        )

      assert {:error, %Ecto.Changeset{} = changeset} =
               Pins.create_pin(
                 %{
                   "title" => "Forged ref",
                   "latitude" => 1.0,
                   "longitude" => 2.0,
                   "pin_type_id" => pin_type.id,
                   "custom_data" => %{"song" => %{"ref" => 9_999_999}}
                 },
                 user.id
               )

      assert "missing required fields: Song" in errors_on(changeset).custom_data
    end

    test "create_pin scrubs forged optional blob refs from custom_data" do
      user = user_fixture()

      pin_type =
        pin_type_fixture(
          %{
            "schema" => %{
              "fields" => [
                %{"key" => "song", "label" => "Song", "type" => "music", "required" => false}
              ]
            }
          },
          user
        )

      assert {:ok, pin} =
               Pins.create_pin(
                 %{
                   "title" => "Optional forged",
                   "latitude" => 1.0,
                   "longitude" => 2.0,
                   "pin_type_id" => pin_type.id,
                   "custom_data" => %{"song" => %{"ref" => 9_999_999}}
                 },
                 user.id
               )

      refute Map.has_key?(pin.custom_data, "song")
    end

    test "update_pin/2 with valid data updates the pin" do
      pin = pin_fixture()
      update_attrs = %{"title" => "some updated title", "latitude" => 456.7, "longitude" => 456.7}

      assert {:ok, %Pin{} = pin} = Pins.update_pin(pin, update_attrs)
      assert pin.title == "some updated title"
      assert pin.latitude == 456.7
      assert pin.longitude == 456.7
    end

    test "update_pin/2 without tags or linked_pin_ids preserves associations" do
      user = user_fixture()
      target = pin_fixture(%{"title" => "Target"}, user)

      {:ok, pin} =
        Pins.create_pin(
          %{
            "title" => "Source",
            "latitude" => 1.0,
            "longitude" => 2.0,
            "pin_type" => "one_time",
            "tags" => ["keep-me"],
            "linked_pin_ids" => [target.id]
          },
          user.id
        )

      assert Enum.map(pin.tags, & &1.name) == ["keep-me"]

      assert {:ok, updated} =
               Pins.update_pin(pin, %{"title" => "Renamed only"})

      assert updated.title == "Renamed only"
      assert Enum.map(updated.tags, & &1.name) == ["keep-me"]

      refs =
        Storymap.Repo.all(
          from r in Storymap.Pins.PinReference,
            where: r.source_pin_id == ^updated.id and r.kind == :explicit
        )

      assert Enum.map(refs, & &1.target_pin_id) == [target.id]
    end

    test "update_pin/2 with empty tags and linked_pin_ids clears associations" do
      user = user_fixture()
      target = pin_fixture(%{"title" => "Target"}, user)

      {:ok, pin} =
        Pins.create_pin(
          %{
            "title" => "Source",
            "latitude" => 1.0,
            "longitude" => 2.0,
            "pin_type" => "one_time",
            "tags" => ["gone"],
            "linked_pin_ids" => [target.id]
          },
          user.id
        )

      assert {:ok, updated} =
               Pins.update_pin(pin, %{
                 "title" => "Cleared",
                 "tags" => [],
                 "linked_pin_ids" => []
               })

      assert updated.tags == []

      refs =
        Storymap.Repo.all(
          from r in Storymap.Pins.PinReference, where: r.source_pin_id == ^updated.id
        )

      assert refs == []
    end

    test "update_pin/3 title-only preserves required tags on community pin" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{
            "community_url" => "preserve-tags",
            "settings" => %{"required_tags" => ["bbq"]}
          },
          owner
        )

      pin_type = simple_pin_type_fixture(%{}, owner)
      :ok = Storymap.SubMaps.PinTypeSettings.replace_enabled_pin_types(sub_map, [pin_type.id])

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type_id" => pin_type.id,
            "tags" => ["bbq"]
          }
        )

      assert {:ok, updated} =
               Pins.update_pin(pin, %{"title" => "Renamed"}, sub_map: sub_map)

      assert updated.title == "Renamed"
      assert "bbq" in Enum.map(updated.tags, & &1.name)
    end

    test "create_pin applies field_blobs atomically and stores refs" do
      user = user_fixture()

      pin_type =
        pin_type_fixture(
          %{
            "schema" => %{
              "fields" => [
                %{"key" => "song", "label" => "Song", "type" => "music", "required" => true}
              ]
            }
          },
          user
        )

      assert {:ok, pin} =
               Pins.create_pin(
                 %{
                   "title" => "With song",
                   "latitude" => 1.0,
                   "longitude" => 2.0,
                   "pin_type_id" => pin_type.id,
                   "field_blobs" => [
                     %{"field_key" => "song", "type" => "music", "payload" => "tempo=100"}
                   ]
                 },
                 user.id
               )

      assert %{"ref" => ref} = pin.custom_data["song"]
      assert is_integer(ref)
      assert Pins.get_field_blob(pin.id, "song", :music).payload == "tempo=100"
    end

    test "create_pin rolls back when field_blobs are invalid" do
      user = user_fixture()
      pin_type = simple_pin_type_fixture(%{}, user)

      assert {:error, %Ecto.Changeset{}} =
               Pins.create_pin(
                 %{
                   "title" => "No blob field",
                   "latitude" => 1.0,
                   "longitude" => 2.0,
                   "pin_type_id" => pin_type.id,
                   "field_blobs" => [
                     %{"field_key" => "song", "type" => "music", "payload" => "tempo=100"}
                   ]
                 },
                 user.id
               )

      assert Pins.list_pins() == []
    end

    test "create_pin requires nested blob for required music fields" do
      user = user_fixture()

      pin_type =
        pin_type_fixture(
          %{
            "schema" => %{
              "fields" => [
                %{"key" => "song", "label" => "Song", "type" => "music", "required" => true}
              ]
            }
          },
          user
        )

      assert {:error, %Ecto.Changeset{} = changeset} =
               Pins.create_pin(
                 %{
                   "title" => "Missing song",
                   "latitude" => 1.0,
                   "longitude" => 2.0,
                   "pin_type_id" => pin_type.id
                 },
                 user.id
               )

      assert "missing required fields: Song" in errors_on(changeset).custom_data
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

      pin_type = simple_pin_type_fixture(%{}, owner)
      :ok = Storymap.SubMaps.PinTypeSettings.replace_enabled_pin_types(sub_map, [pin_type.id])

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type_id" => pin_type.id,
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
      assert Pins.map_path_for_pin(pin) == "/g/path-test/map?pin=#{pin.id}"
      assert Pins.map_path_for_pin(pin.id) == "/g/path-test/map?pin=#{pin.id}"
    end

    test "map_path_for_pin/1 uses world map for legacy pins" do
      pin = pin_fixture()
      assert Pins.map_path_for_pin(pin) == "/map?pin=#{pin.id}"
    end
  end
end
