defmodule Storymap.Pins.ReferenceParser do
  @moduledoc """
  Parses same-origin map URLs with a `?pin=` query from text, mirroring
  `assets/js/react/mapRoute.ts` `parseMapPinLink/1`.
  """

  @http_url_pattern ~r/https?:\/\/[^\s<>"')\]]+/
  @relative_map_pattern ~r/(?:^|[\s(\["'])(\/(?:m\/[^\/\s]+\/)?map\?pin=\d+)/

  @doc """
  Returns the configured application origin used when parsing relative URLs.
  """
  @spec default_origin() :: String.t()
  def default_origin do
    case Application.get_env(:storymap, :app_origin) do
      origin when is_binary(origin) and origin != "" ->
        origin

      _ ->
        endpoint = Application.get_env(:storymap, StorymapWeb.Endpoint)
        url_config = Keyword.get(endpoint, :url, [])

        scheme = Keyword.get(url_config, :scheme, "http") |> to_string()
        host = Keyword.get(url_config, :host, "localhost")
        port = Keyword.get(url_config, :port, 4000)

        port_suffix =
          case {scheme, port} do
            {"https", 443} -> ""
            {"http", 80} -> ""
            {_, p} -> ":#{p}"
          end

        "#{scheme}://#{host}#{port_suffix}"
    end
  end

  @doc """
  Returns `{:ok, pin_id}` for a same-origin map pin URL, or `:error`.
  """
  @spec parse_map_pin_link(String.t(), String.t()) :: {:ok, integer()} | :error
  def parse_map_pin_link(href, origin) when is_binary(href) and is_binary(origin) do
    with {:ok, url} <- parse_url(href, origin),
         true <- same_origin?(url, origin),
         true <- map_pathname?(url.path),
         {:ok, pin_id} <- parse_pin_param(url.query) do
      {:ok, pin_id}
    else
      _ -> :error
    end
  end

  @doc """
  Extracts unique pin ids referenced in `text`, in first-seen order.
  """
  @spec extract_pin_ids_from_text(String.t(), String.t()) :: [integer()]
  def extract_pin_ids_from_text(text, origin) when is_binary(text) and is_binary(origin) do
    text
    |> find_url_candidates()
    |> Enum.reduce([], fn candidate, acc ->
      case parse_map_pin_link(candidate, origin) do
        {:ok, pin_id} ->
          if pin_id in acc, do: acc, else: acc ++ [pin_id]

        :error ->
          acc
      end
    end)
  end

  defp find_url_candidates(text) do
    http =
      @http_url_pattern
      |> Regex.scan(text)
      |> List.flatten()

    relative =
      @relative_map_pattern
      |> Regex.scan(text)
      |> Enum.map(fn
        [_full, path] -> path
        [path] -> path
      end)

    (http ++ relative) |> Enum.uniq()
  end

  defp parse_url(href, origin) do
    absolute =
      if String.starts_with?(href, "http://") or String.starts_with?(href, "https://") do
        href
      else
        origin |> URI.parse() |> URI.merge(href) |> URI.to_string()
      end

    case URI.parse(absolute) do
      %URI{} = url -> {:ok, url}
    end
  end

  defp same_origin?(%URI{scheme: scheme, host: host, port: port}, origin) do
    %URI{scheme: o_scheme, host: o_host, port: o_port} = URI.parse(origin)

    scheme == o_scheme and host == o_host and
      effective_port(port, scheme) == effective_port(o_port, o_scheme)
  end

  defp effective_port(nil, "https"), do: 443
  defp effective_port(nil, "http"), do: 80
  defp effective_port(port, _scheme) when is_integer(port), do: port

  defp map_pathname?(path) do
    normalized =
      path
      |> String.trim_trailing("/")
      |> case do
        "" -> "/"
        p -> p
      end

    normalized in ["/", "/map"] or Regex.match?(~r/^\/m\/[^\/]+\/map$/, normalized)
  end

  defp parse_pin_param(query) when is_binary(query) do
    query
    |> URI.decode_query()
    |> Map.get("pin")
    |> case do
      nil ->
        :error

      value ->
        case Integer.parse(value) do
          {pin_id, ""} when pin_id >= 0 -> {:ok, pin_id}
          _ -> :error
        end
    end
  end

  defp parse_pin_param(_), do: :error
end
