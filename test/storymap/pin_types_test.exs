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
end
