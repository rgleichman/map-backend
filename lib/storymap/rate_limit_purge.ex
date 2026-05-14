defmodule Storymap.RateLimitPurge do
  @moduledoc false
  use GenServer

  @interval_ms 60_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    schedule()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:purge, state) do
    _ = StorymapWeb.Plugs.RateLimit.purge_expired()
    schedule()
    {:noreply, state}
  end

  defp schedule do
    Process.send_after(self(), :purge, @interval_ms)
  end
end
