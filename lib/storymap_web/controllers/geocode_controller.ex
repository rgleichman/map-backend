defmodule StorymapWeb.GeocodeController do
  @moduledoc """
  Proxies geocoding requests to Nominatim (OpenStreetMap).
  Used by the pin add/edit modal for location search.
  """
  use StorymapWeb, :controller

  @nominatim_url "https://nominatim.openstreetmap.org/search"
  @limit 5

  def index(conn, %{"q" => q}) when is_binary(q) and byte_size(q) > 0 do
    q = String.trim(q)

    if String.length(q) < 2 do
      conn
      |> put_status(:bad_request)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"400")
    else
      case geocode(q) do
        {:ok, results} ->
          render(conn, :index, results: results)

        {:error, _} ->
          conn
          |> put_status(:bad_gateway)
          |> put_view(json: StorymapWeb.ErrorJSON)
          |> render(:"502")
      end
    end
  end

  def index(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"400")
  end

  defp geocode(query) do
    params = [
      q: query,
      format: "json",
      limit: @limit
    ]

    url = @nominatim_url <> "?" <> URI.encode_query(params)

    case Req.get(url, headers: [{"User-Agent", "Storymap/1.0"}]) do
      {:ok, %Req.Response{status: 200, body: body}} when is_list(body) ->
        results =
          body
          |> Enum.take(@limit)
          |> Enum.map(fn item ->
            lat = parse_float(item["lat"])
            lon = parse_float(item["lon"])
            %{lat: lat, lng: lon, display_name: item["display_name"] || ""}
          end)

        {:ok, results}

      _ ->
        {:error, :geocode_failed}
    end
  end

  defp parse_float(nil), do: 0.0

  defp parse_float(n) when is_number(n), do: n * 1.0

  defp parse_float(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp parse_float(_), do: 0.0
end
