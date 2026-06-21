defmodule Storymap.Pins.BlobFieldType do
  @moduledoc false

  @values [:music, :drawing]

  @type t :: :music | :drawing

  @spec values() :: [t()]
  def values, do: @values

  @spec default_format(t()) :: String.t()
  def default_format(:music), do: "music/v1"
  def default_format(:drawing), do: "drawing/v1"

  @spec blob_field?(String.t()) :: boolean()
  def blob_field?(type) when type in ["music", "drawing"], do: true
  def blob_field?(_), do: false
end
