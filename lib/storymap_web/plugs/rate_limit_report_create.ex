defmodule StorymapWeb.Plugs.RateLimitReportCreate do
  @moduledoc """
  Applies **fixed-window** rate limits for report submission, using the same ETS counter
  strategy as `StorymapWeb.Plugs.RateLimit` (see `RateLimit.report_create_check/1`).
  """

  alias StorymapWeb.Plugs.RateLimit

  def init(_opts), do: []

  def call(conn, _opts) do
    case RateLimit.report_create_check(conn) do
      :allow -> conn
      :limit_exceeded -> RateLimit.json_429_halt(conn)
    end
  end
end
