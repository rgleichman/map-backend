defmodule StorymapWeb.Plugs.RateLimit do
  @moduledoc """
  Rate-limits requests by client IP using a sliding window in ETS.
  Configure per-pipeline via plug opts; disable in test with config :storymap, __MODULE__, enabled: false.
  """
  import Plug.Conn

  @table :storymap_rate_limit

  def init(opts) do
    limit = Keyword.get(opts, :limit, 20)
    window_sec = Keyword.get(opts, :window_sec, 60)
    format = Keyword.get(opts, :format, :json)
    %{limit: limit, window_sec: window_sec, format: format}
  end

  def call(conn, %{limit: limit, window_sec: window_sec, format: format}) do
    if enabled?() do
      key = key(conn)

      case check(key, limit, window_sec) do
        :allow -> conn
        :limit_exceeded -> halt_with_429(conn, format)
      end
    else
      conn
    end
  end

  defp enabled? do
    Application.get_env(:storymap, __MODULE__, [])[:enabled] != false
  end

  defp key(conn) do
    conn.remote_ip |> :inet.ntoa() |> to_string()
  end

  defp ensure_table! do
    case :ets.whereis(@table) do
      :undefined ->
        try do
          :ets.new(@table, [:set, :public, :named_table])
        rescue
          ArgumentError -> :ok
        end

      _ ->
        :ok
    end
  end

  defp check(key, limit, window_sec) do
    ensure_table!()
    now = System.system_time(:second)

    case :ets.lookup(@table, key) do
      [] ->
        :ets.insert(@table, {key, 1, now})
        :allow

      [{^key, count, window_start}] ->
        if now - window_start >= window_sec do
          :ets.insert(@table, {key, 1, now})
          :allow
        else
          if count >= limit do
            :limit_exceeded
          else
            :ets.update_element(@table, key, [{2, count + 1}])
            :allow
          end
        end
    end
  end

  defp halt_with_429(conn, :json) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(429, ~s|{"errors":{"detail":"Too Many Requests"}}|)
    |> halt()
  end

  defp halt_with_429(conn, _) do
    conn
    |> put_resp_content_type("text/plain")
    |> send_resp(429, "Too Many Requests")
    |> halt()
  end
end
