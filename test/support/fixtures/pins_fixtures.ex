defmodule Storymap.PinsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Storymap.Pins` context.
  """

  import Storymap.AccountsFixtures
  import Storymap.PinTypesFixtures

  @doc """
  Generate a pin. Optionally pass a user to own the pin; otherwise creates one.

  There are no seeded types, so a catalog type is created unless the attrs already
  name one via `pin_type_id` or `pin_type` (slug).
  """
  def pin_fixture(attrs \\ %{}, user \\ nil) do
    user = user || user_fixture()

    attrs =
      attrs
      |> Enum.into(%{})
      |> Map.new(fn
        {k, v} when is_atom(k) -> {to_string(k), v}
        {k, v} -> {k, v}
      end)

    base =
      %{
        "latitude" => 120.5,
        "longitude" => 120.5,
        "title" => "some title"
      }
      |> Map.merge(pin_type_attrs(attrs, user))

    {:ok, pin} =
      base
      |> Map.merge(attrs)
      |> Storymap.Pins.create_pin(user.id)

    pin
  end

  @doc """
  Creates a minimal (schema-less) catalog pin type usable by any pin fixture.
  """
  def simple_pin_type_fixture(attrs \\ %{}, user \\ nil) do
    pin_type_fixture(
      Map.merge(
        %{
          "label" => "Fixture type",
          "slug" => "fixture-type-#{System.unique_integer([:positive])}",
          "schema" => %{"fields" => []}
        },
        stringify(attrs)
      ),
      user
    )
  end

  # The type creator is deliberately a separate user: pin fixtures are also used
  # for muted/restricted users who cannot create catalog types.
  defp pin_type_attrs(attrs, _user) do
    if Map.has_key?(attrs, "pin_type_id") or Map.has_key?(attrs, "pin_type") do
      %{}
    else
      %{"pin_type_id" => simple_pin_type_fixture().id}
    end
  end

  defp stringify(attrs) do
    attrs
    |> Enum.into(%{})
    |> Map.new(fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  @doc """
  Generate a comment on a pin. Pass pin and user, or attrs with pin_id/user_id.
  """
  def pin_comment_fixture(attrs \\ %{}, pin \\ nil, user \\ nil) do
    pin = pin || pin_fixture()
    user = user || user_fixture()

    attrs =
      attrs
      |> Enum.into(%{})
      |> Map.new(fn
        {k, v} when is_atom(k) -> {to_string(k), v}
        {k, v} -> {k, v}
      end)

    body = Map.get(attrs, "body", "Test comment")

    {:ok, comment} =
      Storymap.Pins.Comments.create_comment(pin, user, %{
        "body" => body,
        "parent_id" => Map.get(attrs, "parent_id")
      })

    comment
  end

  @doc """
  Heart a pin for a user.
  """
  def pin_heart_fixture(user, pin) do
    {:ok, _} = Storymap.Pins.Hearts.heart(user, pin)
    :ok
  end
end
