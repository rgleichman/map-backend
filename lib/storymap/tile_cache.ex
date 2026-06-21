defmodule Storymap.TileCache do
  @moduledoc """
  File-based cache for MapTiler tiles and TileJSON. Fetches from upstream on miss.
  """
  require Logger

  @allowed_layers ["satellite-v2", "v3"]
  @max_zoom 22
  @maptiler_base "https://api.maptiler.com/tiles"
  @cache_max_age 2_592_000
  @miss_count_table :storymap_maptiler_miss_count

  @spec allowed_layer?(String.t()) :: boolean()
  def allowed_layer?(layer), do: layer in @allowed_layers

  @spec cache_max_age() :: integer()
  def cache_max_age, do: @cache_max_age

  @spec extension_for_layer(String.t()) :: String.t()
  def extension_for_layer("satellite-v2"), do: "jpg"
  def extension_for_layer("v3"), do: "pbf"

  @spec content_type_for_layer(String.t()) :: String.t()
  def content_type_for_layer("satellite-v2"), do: "image/jpeg"
  def content_type_for_layer("v3"), do: "application/x-protobuf"

  @spec cache_dir() :: String.t()
  def cache_dir do
    Application.get_env(:storymap, :tile_cache_dir) ||
      Application.app_dir(:storymap, "priv/tile_cache")
  end

  defp maptiler_headers(referer) when is_binary(referer) and referer != "",
    do: [{"referer", referer}]

  defp maptiler_headers(_), do: []

  defp log_cache_miss do
    ensure_miss_count_table!()
    count = :ets.update_counter(@miss_count_table, :count, 1, {:count, 0})
    Logger.info("MapTiler cache miss ##{count}")
  end

  defp ensure_miss_count_table! do
    case :ets.whereis(@miss_count_table) do
      :undefined ->
        :ets.new(@miss_count_table, [:set, :public, :named_table])

      _ ->
        :ok
    end
  end

  @spec tile_path(String.t(), integer(), integer(), integer()) :: String.t()
  def tile_path(layer, z, x, y) do
    ext = extension_for_layer(layer)
    Path.join([cache_dir(), layer, Integer.to_string(z), Integer.to_string(x), "#{y}.#{ext}"])
  end

  @spec tiles_json_path(String.t()) :: String.t()
  def tiles_json_path(layer) do
    Path.join([cache_dir(), "tiles_json", "#{layer}.json"])
  end

  @spec get_tile(String.t(), integer(), integer(), integer()) ::
          {:ok, binary()} | {:error, term()} | :miss
  def get_tile(layer, z, x, y) do
    path = tile_path(layer, z, x, y)
    if File.exists?(path), do: File.read(path), else: :miss
  end

  @spec put_tile(String.t(), integer(), integer(), integer(), binary()) :: :ok
  def put_tile(layer, z, x, y, body) do
    path = tile_path(layer, z, x, y)
    dir = Path.dirname(path)
    File.mkdir_p!(dir)
    tmp = Path.join(dir, ".tmp.#{System.unique_integer([:positive])}")
    File.write!(tmp, body)
    File.rename!(tmp, path)
    :ok
  end

  @spec get_tiles_json(String.t()) :: {:ok, binary()} | {:error, term()} | :miss
  def get_tiles_json(layer) do
    path = tiles_json_path(layer)
    if File.exists?(path), do: File.read(path), else: :miss
  end

  @spec put_tiles_json(String.t(), binary()) :: :ok
  def put_tiles_json(layer, body) when is_binary(body) do
    path = tiles_json_path(layer)
    dir = Path.dirname(path)
    File.mkdir_p!(dir)
    tmp = Path.join(dir, ".tmp.#{System.unique_integer([:positive])}.json")
    File.write!(tmp, body)
    File.rename!(tmp, path)
    :ok
  end

  @spec fetch_tile(String.t(), integer(), integer(), integer(), String.t() | nil) ::
          {:ok, binary()} | {:error, term()}
  def fetch_tile(layer, z, x, y, referer \\ nil) do
    log_cache_miss()

    key = Application.get_env(:storymap, :maptiler_api_key)
    ext = extension_for_layer(layer)
    url = "#{@maptiler_base}/#{layer}/#{z}/#{x}/#{y}.#{ext}?key=#{key}"

    Logger.debug("MapTiler request: GET /tiles/#{layer}/#{z}/#{x}/#{y}.#{ext}")

    case Req.get(url, headers: maptiler_headers(referer)) do
      {:ok, %{status: 200, body: body}} ->
        Logger.debug(
          "MapTiler response: 200 OK, tile #{layer}/#{z}/#{x}/#{y}, size=#{byte_size(body)}"
        )

        {:ok, body}

      {:ok, %{status: status}} ->
        Logger.warning("MapTiler response: #{status} for tile #{layer}/#{z}/#{x}/#{y}")
        {:error, status}

      {:error, reason} = err ->
        Logger.warning(
          "MapTiler request failed: tile #{layer}/#{z}/#{x}/#{y}, reason=#{inspect(reason)}"
        )

        err
    end
  end

  @spec fetch_tiles_json(String.t(), String.t() | nil) :: {:ok, term()} | {:error, term()}
  def fetch_tiles_json(layer, referer \\ nil) do
    log_cache_miss()

    key = Application.get_env(:storymap, :maptiler_api_key)
    url = "#{@maptiler_base}/#{layer}/tiles.json?key=#{key}"

    Logger.debug("MapTiler request: GET /tiles/#{layer}/tiles.json")

    case Req.get(url, headers: maptiler_headers(referer)) do
      {:ok, %{status: 200, body: body}} ->
        size = if is_binary(body), do: byte_size(body), else: "(map)"
        Logger.debug("MapTiler response: 200 OK, tiles.json layer=#{layer}, size=#{size}")
        {:ok, body}

      {:ok, %{status: status}} ->
        Logger.warning("MapTiler response: #{status} for tiles.json layer=#{layer}")
        {:error, status}

      {:error, reason} = err ->
        Logger.warning(
          "MapTiler request failed: tiles.json layer=#{layer}, reason=#{inspect(reason)}"
        )

        err
    end
  end

  @spec rewrite_tiles_json_tile_urls(String.t(), String.t(), String.t()) :: String.t()
  def rewrite_tiles_json_tile_urls(body, layer, base_path) when is_binary(body) do
    body |> Jason.decode!() |> rewrite_tiles_json_tile_urls(layer, base_path)
  end

  @spec rewrite_tiles_json_tile_urls(map(), String.t(), String.t()) :: String.t()
  def rewrite_tiles_json_tile_urls(decoded, _layer, base_path) when is_map(decoded) do
    # base_path e.g. "/api/tiles/satellite-v2"
    tiles = Map.get(decoded, "tiles", [])
    rewritten = Enum.map(tiles, fn _ -> "#{base_path}/{z}/{x}/{y}" end)
    decoded = Map.put(decoded, "tiles", rewritten)
    Jason.encode!(decoded)
  end

  @spec valid_tile_params?(integer(), integer(), integer()) :: boolean()
  def valid_tile_params?(z, x, y) when is_integer(z) and z >= 0 and z <= @max_zoom do
    max_xy = round(:math.pow(2, z)) - 1

    is_integer(x) and x >= 0 and x <= max_xy and
      is_integer(y) and y >= 0 and y <= max_xy
  end

  def valid_tile_params?(_, _, _), do: false
end
