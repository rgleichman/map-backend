defmodule Storymap.PinsTest do
  use Storymap.DataCase

  alias Storymap.Pins

  import Storymap.PinsFixtures
  import Storymap.AccountsFixtures

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
      assert Pins.list_pins() == [pin]
    end

    test "get_pin!/1 returns the pin with given id" do
      pin = pin_fixture()
      assert Pins.get_pin!(pin.id) == pin
    end

    test "create_pin/2 with valid data creates a pin" do
      user = user_fixture()

      assert {:ok, %Pin{} = pin} = Pins.create_pin(@valid_attrs, user.id)
      assert pin.title == "some title"
      assert pin.latitude == 120.5
      assert pin.longitude == 120.5
    end

    test "create_pin/2 with invalid data returns error changeset" do
      user = user_fixture()
      assert {:error, %Ecto.Changeset{}} = Pins.create_pin(@invalid_attrs, user.id)
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
      assert pin == Pins.get_pin!(pin.id)
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
  end
end
