defmodule Storymap.Trust.Recompute do
  @moduledoc false
  use GenServer

  require Logger

  alias Storymap.Trust
  alias Storymap.Trust.Scores

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Request a recompute soon (debounced via GenServer cast).
  No-ops when `recompute_on_events` is false (test default).
  """
  @spec schedule_soon() :: :ok
  def schedule_soon do
    if Trust.config(:recompute_on_events, true) do
      GenServer.cast(__MODULE__, :recompute_soon)
    else
      :ok
    end
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
    _ = safe_recompute()
    schedule_periodic()
    {:noreply, state}
  end

  def handle_info(:recompute_now, state) do
    _ = safe_recompute()
    {:noreply, state}
  end

  @impl true
  def handle_cast(:recompute_soon, state) do
    Process.send_after(self(), :recompute_now, 2_000)
    {:noreply, state}
  end

  defp safe_recompute do
    Scores.recompute_all()
  rescue
    e in [DBConnection.OwnershipError, DBConnection.ConnectionError] ->
      Logger.debug("trust recompute skipped: #{Exception.message(e)}")
      {:error, :skipped}
  end

  defp schedule_periodic do
    interval = Trust.config(:recompute_interval_ms, 300_000)
    Process.send_after(self(), :periodic, interval)
  end
end
