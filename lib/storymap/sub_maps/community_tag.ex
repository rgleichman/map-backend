defmodule Storymap.SubMaps.CommunityTag do
  @moduledoc """
  Reserved tag prefix for sub-map membership on pins.

  Pins created in a community automatically receive `community:<community_url>`.
  The world-map tag filter can surface these tags; future crossposting can add
  additional `community:*` tags without changing `sub_map_id`.
  """

  @prefix "community:"

  def prefix, do: @prefix

  def name(%{community_url: url}) when is_binary(url), do: @prefix <> url

  def name(url) when is_binary(url), do: @prefix <> url

  def community_url_from_tag(tag) when is_binary(tag) do
    case String.split(tag, @prefix, parts: 2) do
      ["", url] when url != "" -> {:ok, url}
      _ -> :error
    end
  end

  def community_tag?(tag) when is_binary(tag), do: String.starts_with?(tag, @prefix)
  def community_tag?(_), do: false

  @doc """
  Merges the community tag into a tag name list without duplicates.
  """
  def merge(tags, sub_map) when is_list(tags) do
    community = name(sub_map)
    normalized = Enum.map(tags, &to_string/1)

    if community in normalized do
      normalized
    else
      [community | normalized]
    end
  end
end
