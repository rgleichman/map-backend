defmodule Storymap.PerformanceHelpers do
  @moduledoc """
  Helpers for performance-oriented ExUnit tests: query counting and timing.
  """

  import ExUnit.Assertions

  @repo_query_event [:storymap, :repo, :query]

  @doc """
  Runs `fun/0` and returns `{result, query_count}` counting Ecto repo queries.
  """
  def with_query_count(fun) when is_function(fun, 0) do
    handler_id = make_ref()
    count = :counters.new(1, [:atomics])

    :ok =
      :telemetry.attach(
        handler_id,
        @repo_query_event,
        fn _event, _measurements, _metadata, counter ->
          :counters.add(counter, 1, 1)
        end,
        count
      )

    try do
      result = fun.()
      {result, :counters.get(count, 1)}
    after
      :telemetry.detach(handler_id)
    end
  end

  @doc """
  Runs `fun/0` and returns `{result, elapsed_ms}` using `:timer.tc/1`.
  """
  def with_timing_ms(fun) when is_function(fun, 0) do
    {microseconds, result} = :timer.tc(fun)
    {result, div(microseconds, 1000)}
  end

  @doc """
  Asserts `fun/0` completes within `max_ms` milliseconds (wall clock).
  """
  def assert_under_ms(max_ms, fun)
      when is_integer(max_ms) and max_ms > 0 and is_function(fun, 0) do
    {_result, elapsed_ms} = with_timing_ms(fun)

    assert elapsed_ms < max_ms,
           "expected block to finish in < #{max_ms}ms, took #{elapsed_ms}ms"
  end
end
