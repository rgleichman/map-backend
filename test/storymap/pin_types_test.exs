defmodule Storymap.PinTypesTest do
  use Storymap.DataCase

  import Storymap.AccountsFixtures
  import Storymap.PinTypesFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType

  describe "create_pin_type/2" do
    test "creates a global custom pin type" do
      user = user_fixture()
      scope = %Scope{user: user}

      assert {:ok, %CustomPinType{slug: slug}} =
               PinTypes.create_pin_type(scope, %{
                 "label" => "Food Truck",
                 "schema" => %{
                   "fields" => [%{"key" => "cuisine", "label" => "Cuisine", "type" => "text"}]
                 }
               })

      assert is_binary(slug)
      assert PinTypes.get_by_slug(slug)
    end

    test "rejects invalid marker_color" do
      user = user_fixture()
      scope = %Scope{user: user}

      assert {:error, changeset} =
               PinTypes.create_pin_type(scope, %{
                 "label" => "Bad Color",
                 "marker_color" => "red",
                 "schema" => %{"fields" => [%{"key" => "x", "label" => "X", "type" => "text"}]}
               })

      assert "must be a hex color like #RRGGBB" in errors_on(changeset).marker_color
    end

    test "rejects invalid schema" do
      user = user_fixture()
      scope = %Scope{user: user}

      assert {:error, changeset} =
               PinTypes.create_pin_type(scope, %{"label" => "Bad", "schema" => %{}})

      assert "must include a fields array" in errors_on(changeset).schema
    end

    test "forbids muted user" do
      user = muted_user_fixture()
      scope = %Scope{user: user}

      assert {:error, :forbidden} =
               PinTypes.create_pin_type(scope, %{
                 "label" => "Muted",
                 "schema" => %{
                   "fields" => [%{"key" => "x", "label" => "X", "type" => "text"}]
                 }
               })
    end
  end

  describe "update_pin_type/3 and delete_pin_type/2" do
    test "forbids muted owner" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      muted = muted_user_fixture(user)
      scope = %Scope{user: muted}

      assert {:error, :forbidden} =
               PinTypes.update_pin_type(scope, pin_type, %{"label" => "Renamed"})

      assert {:error, :forbidden} = PinTypes.delete_pin_type(scope, pin_type)
    end
  end

  describe "delete_pin_type/2" do
    test "blocks delete when pins use the type" do
      user = user_fixture()
      scope = %Scope{user: user}
      pin_type = custom_pin_type_fixture(%{}, user)

      assert {:ok, _} =
               Storymap.Pins.create_pin(
                 %{
                   "title" => "Machine",
                   "latitude" => 30.0,
                   "longitude" => -97.0,
                   "pin_type" => CustomPinType.pin_type_value(pin_type),
                   "custom_data" => %{"status" => "working"}
                 },
                 user.id
               )

      assert {:error, :in_use} = PinTypes.delete_pin_type(scope, pin_type)
    end
  end

  describe "catalog helpers" do
    test "list_all_pin_types/0 includes disabled types" do
      user = user_fixture()
      scope = %Scope{user: user}
      enabled = custom_pin_type_fixture(%{}, user)

      {:ok, disabled} =
        PinTypes.create_pin_type(scope, %{
          "label" => "Disabled Type",
          "enabled" => false,
          "schema" => %{"fields" => [%{"key" => "x", "label" => "X", "type" => "text"}]}
        })

      slugs = PinTypes.list_all_pin_types() |> Enum.map(& &1.slug)
      assert enabled.slug in slugs
      assert disabled.slug in slugs
    end

    test "get_by_slug/1 returns nil for non-binary" do
      assert PinTypes.get_by_slug(nil) == nil
    end

    test "get_by_pin_type/1 returns nil for builtin types" do
      assert PinTypes.get_by_pin_type("one_time") == nil
    end

    test "create_pin_type/2 unauthorized without scope user" do
      assert {:error, :unauthorized} =
               PinTypes.create_pin_type(nil, %{
                 "label" => "Nope",
                 "schema" => %{"fields" => [%{"key" => "x", "label" => "X", "type" => "text"}]}
               })
    end

    test "update_pin_type/3 success" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      scope = %Scope{user: user}

      assert {:ok, updated} =
               PinTypes.update_pin_type(scope, pin_type, %{"label" => "Renamed Arcade"})

      assert updated.label == "Renamed Arcade"
    end

    test "update_pin_type/3 accepts atom keys" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      scope = %Scope{user: user}

      assert {:ok, updated} =
               PinTypes.update_pin_type(scope, pin_type, %{label: "Atom Renamed"})

      assert updated.label == "Atom Renamed"
    end

    test "delete_pin_type/2 success when unused" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      scope = %Scope{user: user}

      assert {:ok, deleted} = PinTypes.delete_pin_type(scope, pin_type)
      assert deleted.id == pin_type.id
      refute PinTypes.get_by_slug(pin_type.slug)
    end

    test "available_pin_types_for_settings/1 filters enabled slugs" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      other = custom_pin_type_fixture(%{}, user)

      available =
        PinTypes.available_pin_types_for_settings(%{
          "enabled_custom_pin_types" => [pin_type.slug]
        })

      assert Enum.map(available, & &1.slug) == [pin_type.slug]
      refute other.slug in Enum.map(available, & &1.slug)
    end

    test "available_pin_types_for_world/0 returns enabled types" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)

      assert pin_type.slug in Enum.map(PinTypes.available_pin_types_for_world(), & &1.slug)
    end

    test "change_pin_type/2 returns a changeset" do
      pin_type = custom_pin_type_fixture()
      changeset = PinTypes.change_pin_type(pin_type, %{"label" => "Draft"})
      assert %Ecto.Changeset{} = changeset
      assert Ecto.Changeset.get_change(changeset, :label) == "Draft"
    end
  end
end
