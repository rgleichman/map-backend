defmodule StorymapWeb.MapPaths do
  @moduledoc """
  Map and garden URL classification and un-verified path builders.

  Phoenix `router.ex` and `~p` remain the source of truth for navigation.
  Keep in sync with `assets/js/react/mapRoute.ts`.
  """

  @root "/"
  @world_map "/map"
  @garden_prefix "/g"
  @legacy_garden_prefix "/m"

  @spec root() :: String.t()
  def root, do: @root

  @spec world_map() :: String.t()
  def world_map, do: @world_map

  @spec garden_prefix() :: String.t()
  def garden_prefix, do: @garden_prefix

  @spec legacy_garden_prefix() :: String.t()
  def legacy_garden_prefix, do: @legacy_garden_prefix

  @doc "Strip trailing slashes; empty becomes `/`."
  @spec normalize(String.t()) :: String.t()
  def normalize(path) when is_binary(path) do
    case String.trim_trailing(path, "/") do
      "" -> @root
      trimmed -> trimmed
    end
  end

  @doc "True for world map (`/`, `/map`) and garden maps (`/g/:url/map`, legacy `/m`)."
  @spec map_pathname?(String.t()) :: boolean()
  def map_pathname?(path) when is_binary(path) do
    case normalize(path) do
      @root -> true
      @world_map -> true
      trimmed -> garden_map_pathname?(trimmed)
    end
  end

  @doc "True when the Gardens nav item should be current (index or garden pages, not maps)."
  @spec garden_nav_active?(String.t()) :: boolean()
  def garden_nav_active?(path) when is_binary(path) do
    trimmed = normalize(path)

    trimmed in [@garden_prefix, @legacy_garden_prefix] or
      garden_non_map_page?(trimmed, @garden_prefix) or
      garden_non_map_page?(trimmed, @legacy_garden_prefix)
  end

  @doc "Community slug from a canonical `/g/:url/map` path, or nil."
  @spec community_url(String.t()) :: String.t() | nil
  def community_url(path) when is_binary(path) do
    trimmed = normalize(path)
    prefix = @garden_prefix <> "/"

    if String.starts_with?(trimmed, prefix) and String.ends_with?(trimmed, "/map") do
      rest =
        trimmed
        |> String.replace_prefix(prefix, "")
        |> String.replace_suffix("/map", "")

      if rest != "" and not String.contains?(rest, "/") do
        rest
      end
    end
  end

  @doc "World map path, or canonical garden map path for a community slug."
  @spec map_path(String.t() | nil) :: String.t()
  def map_path(nil), do: @world_map

  def map_path(community_url) when is_binary(community_url) do
    @garden_prefix <> "/" <> community_url <> "/map"
  end

  @doc "Map path with an explicit `?pin=` query."
  @spec map_path_with_pin(String.t() | nil, integer()) :: String.t()
  def map_path_with_pin(community_url, pin_id) when is_integer(pin_id) do
    map_path(community_url) <> "?pin=#{pin_id}"
  end

  defp garden_map_pathname?(path) do
    garden_map_under?(path, @garden_prefix) or garden_map_under?(path, @legacy_garden_prefix)
  end

  defp garden_map_under?(path, prefix) do
    String.starts_with?(path, prefix <> "/") and String.ends_with?(path, "/map")
  end

  defp garden_non_map_page?(path, prefix) do
    String.starts_with?(path, prefix <> "/") and not String.ends_with?(path, "/map")
  end
end
