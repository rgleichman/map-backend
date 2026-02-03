defmodule Storymap.PinsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Storymap.Pins` context.
  """

  import Storymap.AccountsFixtures

  @doc """
  Generate a pin. Optionally pass a user to own the pin; otherwise creates one.
  """
  def pin_fixture(attrs \\ %{}, user \\ nil) do
    user = user || user_fixture()

    base =
      %{
        "latitude" => 120.5,
        "longitude" => 120.5,
        "title" => "some title",
        "pin_type" => "one_time"
      }

    attrs =
      attrs
      |> Enum.into(%{})
      |> Map.new(fn
        {k, v} when is_atom(k) -> {to_string(k), v}
        {k, v} -> {k, v}
      end)

    {:ok, pin} =
      base
      |> Map.merge(attrs)
      |> Storymap.Pins.create_pin(user.id)

    pin
  end
end
