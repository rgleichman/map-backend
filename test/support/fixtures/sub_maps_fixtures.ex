defmodule Storymap.SubMapsFixtures do
  @moduledoc false
  import Storymap.AccountsFixtures
  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

  def sub_map_fixture(attrs \\ %{}, owner \\ nil) do
    owner = owner || user_fixture()

    attrs =
      attrs
      |> Enum.into(%{})
      |> Map.new(fn
        {k, v} when is_atom(k) -> {to_string(k), v}
        {k, v} -> {k, v}
      end)

    base = %{
      "name" => "Test Community #{System.unique_integer([:positive])}",
      "community_url" => "test-#{System.unique_integer([:positive])}",
      "contribution_mode" => "open",
      "promote_to_world_default" => "ask",
      "visibility" => "public"
    }

    {:ok, sub_map} =
      base
      |> Map.merge(attrs)
      |> then(&SubMaps.create_sub_map(%Scope{user: owner}, &1))

    sub_map
  end
end
