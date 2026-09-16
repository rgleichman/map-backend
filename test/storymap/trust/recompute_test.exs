defmodule Storymap.Trust.RecomputeTest do
  use ExUnit.Case, async: false

  alias Storymap.Trust.Recompute

  test "schedule_soon coalesces timers into a single pending recompute" do
    name = :"recompute_test_#{System.unique_integer([:positive])}"

    {:ok, pid} =
      start_supervised({Recompute, name: name, skip_periodic: true, debounce_ms: 5_000})

    GenServer.cast(pid, :recompute_soon)
    :sys.get_state(pid)
    first_ref = :sys.get_state(pid).timer_ref
    assert is_reference(first_ref)
    assert is_integer(Process.read_timer(first_ref))

    GenServer.cast(pid, :recompute_soon)
    GenServer.cast(pid, :recompute_soon)
    :sys.get_state(pid)

    state = :sys.get_state(pid)
    assert is_reference(state.timer_ref)
    assert Process.read_timer(first_ref) == false
    assert is_integer(Process.read_timer(state.timer_ref))
  end
end
