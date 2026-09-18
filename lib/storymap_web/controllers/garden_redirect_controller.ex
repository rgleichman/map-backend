defmodule StorymapWeb.GardenRedirectController do
  @moduledoc "Permanent redirects from legacy `/m` garden URLs to `/g`."
  use StorymapWeb, :controller

  @spec from_m(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def from_m(conn, params) do
    rest =
      case params do
        %{"path" => path} when is_list(path) -> "/" <> Enum.join(path, "/")
        _ -> ""
      end

    redirect_to_g(conn, rest)
  end

  @spec redirect_to_g(Plug.Conn.t(), String.t()) :: Plug.Conn.t()
  defp redirect_to_g(conn, rest) do
    target =
      case conn.query_string do
        "" -> "/g" <> rest
        qs -> "/g" <> rest <> "?" <> qs
      end

    conn
    |> put_status(:moved_permanently)
    |> redirect(to: target)
  end
end
