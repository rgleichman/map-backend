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
