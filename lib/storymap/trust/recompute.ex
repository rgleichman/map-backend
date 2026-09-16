defmodule Storymap.Trust.Recompute do
  @moduledoc false
  use GenServer

  require Logger

  alias Storymap.Trust
  alias Storymap.Trust.Scores

  @default_debounce_ms 2_000

  @type state :: %{
          timer_ref: reference() | nil,
          debounce_ms: non_neg_integer()
        }

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
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
  @spec init(keyword()) :: {:ok, state()}
  def init(opts) do
    unless Keyword.get(opts, :skip_periodic, false) do
      schedule_periodic()
    end

    debounce_ms = Keyword.get(opts, :debounce_ms, @default_debounce_ms)
    {:ok, %{timer_ref: nil, debounce_ms: debounce_ms}}
  end

  @impl true
  @spec handle_info(:periodic | :recompute_now, state()) :: {:noreply, state()}
  def handle_info(:periodic, state) do
    _ = safe_recompute()
    schedule_periodic()
    {:noreply, state}
  end

  def handle_info(:recompute_now, state) do
    _ = safe_recompute()
    {:noreply, %{state | timer_ref: nil}}
  end

  @impl true
  @spec handle_cast(:recompute_soon, state()) :: {:noreply, state()}
  def handle_cast(:recompute_soon, state) do
    if ref = state.timer_ref do
      Process.cancel_timer(ref)
    end

    ref = Process.send_after(self(), :recompute_now, state.debounce_ms)
    {:noreply, %{state | timer_ref: ref}}
  end

  @spec safe_recompute() :: {:ok, non_neg_integer()} | {:error, :skipped}
  defp safe_recompute do
    Scores.recompute_all()
  rescue
    e in [DBConnection.OwnershipError, DBConnection.ConnectionError] ->
      Logger.debug("trust recompute skipped: #{Exception.message(e)}")
      {:error, :skipped}
  end

  @spec schedule_periodic() :: reference()
  defp schedule_periodic do
    interval = Trust.config(:recompute_interval_ms, 300_000)
    Process.send_after(self(), :periodic, interval)
  end
end
