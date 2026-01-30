defmodule Storymap.GeocodeCache do
  @moduledoc """
  In-memory cache for Nominatim geocode results. Reduces repeat requests
  and helps comply with Nominatim usage policy (caching required).
  """
  use GenServer

  @table :storymap_geocode_cache
  @ttl_seconds 86_400  # 24 hours

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def get(query) when is_binary(query) do
    key = String.trim(query) |> String.downcase()
    now = System.system_time(:second)

    case :ets.lookup(@table, key) do
      [{^key, results, expiry}] when expiry > now -> {:ok, results}
      _ -> :miss
    end
  end

  def put(query, results) when is_binary(query) and is_list(results) do
    key = String.trim(query) |> String.downcase()
    expiry = System.system_time(:second) + @ttl_seconds
    :ets.insert(@table, {key, results, expiry})
    :ok
  end

  @impl true
  def init(_opts) do
    :ets.new(@table, [:set, :public, :named_table])
    {:ok, %{}}
  end
end
