defmodule StorymapWeb.Plugs.RequireAdminLevel do
  @moduledoc false

  import Plug.Conn

  @spec init(keyword()) :: %{min_admin_level: integer()}
  def init(opts) do
    %{min_admin_level: Keyword.fetch!(opts, :min_admin_level)}
  end

  @spec call(Plug.Conn.t(), %{min_admin_level: integer()}) :: Plug.Conn.t()
  def call(conn, %{min_admin_level: min_admin_level}) do
    case conn.assigns[:current_scope] do
      %{user: %{admin_level: admin_level}} when admin_level >= min_admin_level ->
        conn

      _ ->
        conn
        |> put_status(:forbidden)
        |> put_resp_content_type("application/json")
        |> send_resp(403, ~s|{"errors":{"detail":"forbidden"}}|)
        |> halt()
    end
  end
end
