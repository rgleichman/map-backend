defmodule Storymap.PinTypes.ValidatorTest do
  use Storymap.DataCase

  import Storymap.PinTypesFixtures
  import Ecto.Changeset, only: [get_field: 2]

  alias Storymap.Pins.Pin
  alias Storymap.PinTypes.Validator

  test "validates required custom fields" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "missing required fields: Status" in errors_on(changeset).custom_data
  end

  test "accepts valid custom data" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "working", "cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert get_field(changeset, :custom_data) == %{"status" => "working", "cost" => 1}
  end
end
