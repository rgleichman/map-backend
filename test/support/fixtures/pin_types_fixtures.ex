defmodule Storymap.PinTypesFixtures do
  @moduledoc false

  import Storymap.AccountsFixtures

  alias Storymap.Accounts.Scope

  @default_schema %{
    "fields" => [
      %{
        "key" => "status",
        "label" => "Status",
        "type" => "select",
        "required" => true,
        "options" => [
          %{"value" => "working", "label" => "Working"},
          %{"value" => "broken", "label" => "Broken"}
        ]
      },
      %{"key" => "cost", "label" => "Cost", "type" => "number"}
    ]
  }

  def custom_pin_type_fixture(attrs \\ %{}, user \\ nil) do
    user = user || user_fixture()
    scope = %Scope{user: user}

    attrs =
      attrs
      |> Enum.into(%{})
      |> Map.new(fn
        {k, v} when is_atom(k) -> {to_string(k), v}
        {k, v} -> {k, v}
      end)

    params =
      Map.merge(
        %{
          "label" => "Pinball Arcade",
          "slug" => "pinball-arcade-#{System.unique_integer([:positive])}",
          "description" => "Arcade machine details",
          "marker_color" => "#6366f1",
          "schema" => @default_schema
        },
        attrs
      )

    {:ok, pin_type} = Storymap.PinTypes.create_pin_type(scope, params)
    pin_type
  end
end
