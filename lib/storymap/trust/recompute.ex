defmodule Storymap.Trust.Recompute do
  @moduledoc false
  use GenServer

  alias Storymap.Trust
  alias Storymap.Trust.Scores

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Request a recompute soon (debounced via GenServer cast).
  """
  @spec schedule_soon() :: :ok
  def schedule_soon do
    GenServer.cast(__MODULE__, :recompute_soon)
  catch
    :exit, _ -> :ok
  end

  @doc """
  Run recompute synchronously in this process (for Mix tasks / tests).
  """
  @spec run_now(DateTime.t() | nil) :: {:ok, non_neg_integer()}
  def run_now(as_of \\ nil) do
    Scores.recompute_all(as_of)
  end

  @impl true
  def init(_opts) do
    schedule_periodic()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:periodic, state) do
    _ = Scores.recompute_all()
    schedule_periodic()
    {:noreply, state}
  end

  def handle_info(:recompute_now, state) do
    _ = Scores.recompute_all()
    {:noreply, state}
  end

  @impl true
  def handle_cast(:recompute_soon, state) do
    Process.send_after(self(), :recompute_now, 2_000)
    {:noreply, state}
  end

  defp schedule_periodic do
    interval = Trust.config(:recompute_interval_ms, 300_000)
    Process.send_after(self(), :periodic, interval)
  end
end
