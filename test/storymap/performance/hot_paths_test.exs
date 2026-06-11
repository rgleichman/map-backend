defmodule Storymap.Performance.HotPathsTest do
  @moduledoc """
  Lightweight timing guards for frequently-used query paths.
  Thresholds are generous to avoid flaky CI; they catch major regressions.
  """
  use Storymap.DataCase

  import Storymap.SubMapsFixtures

  alias Storymap.Pins.Query
  alias Storymap.Repo
  alias Storymap.SubMaps

  @list_public_budget_us 200_000
  @world_pins_budget_us 200_000

  test "list_public/1 completes within budget" do
    sub_map_fixture(%{"name" => "Perf Community", "community_url" => "perf-community"})

    {micros, sub_maps} = :timer.tc(fn -> SubMaps.list_public() end)

    assert is_list(sub_maps)

    assert micros < @list_public_budget_us,
           "list_public took #{micros}µs (budget #{@list_public_budget_us}µs)"
  end

  test "world_pins query completes within budget" do
    {micros, pins} =
      :timer.tc(fn ->
        Query.base()
        |> Query.world_pins()
        |> Repo.all()
      end)

    assert is_list(pins)

    assert micros < @world_pins_budget_us,
           "world_pins took #{micros}µs (budget #{@world_pins_budget_us}µs)"
  end
end
