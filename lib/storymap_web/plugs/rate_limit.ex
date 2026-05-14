defmodule StorymapWeb.Plugs.RateLimit do
  @moduledoc """
  Rate-limits requests by client IP using a **fixed window** counter in ETS (window starts
  on the first request in a period). Keys often embed the client IP string; rows include
  `window_sec` so expired buckets can be purged and IPs are not kept longer than needed.

  Configure per-pipeline via plug opts; disable in test with `config :storymap, __MODULE__, enabled: false`.

  Periodic expiry is handled by `Storymap.RateLimitPurge` (see `purge_expired/1`).
  """
  import Plug.Conn

  @table :storymap_rate_limit

  # Legacy 3-tuple rows had no window length; purge conservatively after this many seconds.
  @legacy_max_window_sec 3600

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

  @doc """
  Fixed-window limit for Help page contact form submissions, keyed by client IP string.
  Uses the same ETS table as `call/2` but a distinct key prefix so limits stay independent
  of other plugs. Respects the same `enabled: false` config as the plug (e.g. in test).
  """
  def contact_form_check(client_ip) when is_binary(client_ip) do
    if enabled?() do
      check("contact_form:" <> client_ip, 5, 3600)
    else
      :allow
    end
  end

  @doc """
  Rate limit for `POST /api/reports`: stricter for anonymous (IP key), looser per logged-in user.
  """
  def report_create_check(conn) do
    if enabled?() do
      ip = conn.remote_ip |> :inet.ntoa() |> to_string()

      key =
        case conn.assigns[:current_scope] do
          %{user: %{id: id}} -> "report_create:user:#{id}"
          _ -> "report_create:ip:#{ip}"
        end

      {limit, window} =
        case conn.assigns[:current_scope] do
          %{user: %{id: _}} -> {30, 60}
          _ -> {10, 60}
        end

      check(key, limit, window)
    else
      :allow
    end
  end

  @doc """
  Deletes ETS rows whose window has ended. Keys (including IP substrings) are dropped
  shortly after they no longer affect rate limiting.

  `now` is Unix seconds (same as `System.system_time(:second)`); override in tests.
  Returns the number of rows deleted.
  """
  def purge_expired(now \\ System.system_time(:second)) when is_integer(now) do
    ensure_table!()

    case :ets.whereis(@table) do
      :undefined ->
        0

      _ ->
        keys =
          for row <- :ets.tab2list(@table),
              key = expired_key(row, now),
              not is_nil(key),
              do: key

        Enum.each(keys, &:ets.delete(@table, &1))
        length(keys)
    end
  end

  @doc false
  def json_429_halt(conn), do: halt_with_429(conn, :json)

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

  defp expired_key({key, _count, window_start, window_sec}, now)
       when is_integer(window_start) and is_integer(window_sec) and
              now > window_start + window_sec do
    key
  end

  defp expired_key({key, _count, window_start} = row, now)
       when tuple_size(row) == 3 and is_integer(window_start) and
              now > window_start + @legacy_max_window_sec do
    key
  end

  defp expired_key(_, _), do: nil

  defp check(key, limit, window_sec) do
    ensure_table!()
    now = System.system_time(:second)
    do_check(key, limit, window_sec, now)
  end

  defp do_check(key, limit, window_sec, now) do
    case :ets.lookup(@table, key) do
      [] ->
        :ets.insert(@table, {key, 1, now, window_sec})
        :allow

      [{^key, _count, _window_start} = legacy] when tuple_size(legacy) == 3 ->
        :ets.delete(@table, key)
        do_check(key, limit, window_sec, now)

      [{^key, count, window_start, stored_window}] ->
        cond do
          now - window_start >= stored_window ->
            :ets.insert(@table, {key, 1, now, window_sec})
            :allow

          count >= limit ->
            :limit_exceeded

          true ->
            :ets.update_element(@table, key, [{2, count + 1}])
            :allow
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
