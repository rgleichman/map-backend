defmodule StorymapWeb.MapController do
  use StorymapWeb, :controller

  alias MapLibre
  alias Storymap.TileCache

  def index(conn, _params) do
    render(conn, :map)
  end

  def style(conn, _params) do
    maptiler_key = Application.get_env(:storymap, :maptiler_api_key)

    spec =
      MapLibre.new(style: :terrain, key: maptiler_key)
      |> MapLibre.to_spec()
      |> Map.put("projection", %{"type" => "globe"})
      |> maybe_rewrite_style_for_tile_cache()

    json(conn, spec)
  end

  def tiles_json(conn, params) do
    if !tile_cache_enabled?() do
      conn
      |> put_status(404)
      |> put_resp_content_type("application/json")
      |> send_resp(404, ~s|{"error":"not found"}|)
    else
      tiles_json_impl(conn, params)
    end
  end

  defp tiles_json_impl(conn, params) do
    layer = params["layer"]

    if !TileCache.allowed_layer?(layer) do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "invalid layer"})
    else
      base_path = "/api/tiles/#{layer}"

      result =
        case TileCache.get_tiles_json(layer) do
          {:ok, cached} ->
            {:ok, TileCache.rewrite_tiles_json_tile_urls(cached, layer, base_path)}

          :miss ->
            case TileCache.fetch_tiles_json(layer, request_origin(conn)) do
              {:ok, body} ->
                rewritten = TileCache.rewrite_tiles_json_tile_urls(body, layer, base_path)
                TileCache.put_tiles_json(layer, rewritten)
                {:ok, rewritten}

              {:error, reason} ->
                status = upstream_error_status(reason)

                {:error,
                 conn
                 |> put_status(status)
                 |> put_resp_content_type("application/json")
                 |> send_resp(status, ~s|{"error":"upstream error"}|)
                 |> halt()}
            end
        end

      case result do
        {:ok, body} ->
          conn
          |> put_resp_header("cache-control", "public, max-age=#{TileCache.cache_max_age()}")
          |> put_resp_content_type("application/json")
          |> send_resp(200, body)

        {:error, halted_conn} ->
          halted_conn
      end
    end
  end

  def tile(conn, params) do
    if !tile_cache_enabled?() do
      conn
      |> put_status(404)
      |> put_resp_content_type("application/json")
      |> send_resp(404, ~s|{"error":"not found"}|)
    else
      tile_impl(conn, params)
    end
  end

  defp tile_impl(conn, params) do
    layer = params["layer"]

    with true <- TileCache.allowed_layer?(layer),
         {z, ""} <- Integer.parse(params["z"] || ""),
         {x, ""} <- Integer.parse(params["x"] || ""),
         {y, ""} <- Integer.parse(params["y"] || ""),
         true <- TileCache.valid_tile_params?(z, x, y) do
      serve_tile(conn, layer, z, x, y)
    else
      _ ->
        conn
        |> put_status(:bad_request)
        |> put_resp_content_type("application/json")
        |> json(%{error: "invalid tile params"})
    end
  end

  defp tile_cache_enabled?, do: Application.get_env(:storymap, :tile_cache_enabled, false)

  # Normalize TileCache/Req error to valid HTTP status (network errors -> 502 Bad Gateway)
  defp upstream_error_status(status) when is_integer(status) and status >= 100 and status <= 599,
    do: status

  defp upstream_error_status(_), do: 502

  defp maybe_rewrite_style_for_tile_cache(spec) do
    if tile_cache_enabled?(), do: rewrite_style_source_urls(spec), else: spec
  end

  defp request_origin(conn) do
    "#{conn.scheme}://#{conn.host}:#{conn.port}/"
  end

  defp rewrite_style_source_urls(spec) do
    sources = spec["sources"] || %{}

    sources =
      Map.new(sources, fn {name, source} ->
        url = Map.get(source, "url", "")

        new_url =
          cond do
            url =~ "satellite-v2/tiles.json" -> "/api/map/tiles.json?layer=satellite-v2"
            url =~ "v3/tiles.json" -> "/api/map/tiles.json?layer=v3"
            true -> url
          end

        {name, Map.put(source, "url", new_url)}
      end)

    Map.put(spec, "sources", sources)
  end

  defp serve_tile(conn, layer, z, x, y) do
    case TileCache.get_tile(layer, z, x, y) do
      {:ok, body} ->
        conn
        |> put_resp_header("cache-control", "public, max-age=#{TileCache.cache_max_age()}")
        |> put_resp_content_type(TileCache.content_type_for_layer(layer))
        |> send_resp(200, body)

      :miss ->
        case TileCache.fetch_tile(layer, z, x, y, request_origin(conn)) do
          {:ok, body} ->
            TileCache.put_tile(layer, z, x, y, body)

            conn
            |> put_resp_header("cache-control", "public, max-age=#{TileCache.cache_max_age()}")
            |> put_resp_content_type(TileCache.content_type_for_layer(layer))
            |> send_resp(200, body)

          {:error, reason} ->
            status = upstream_error_status(reason)

            conn
            |> put_status(status)
            |> put_resp_content_type("application/json")
            |> send_resp(status, ~s|{"error":"upstream error"}|)
        end
    end
  end
end
