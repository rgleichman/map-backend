defmodule Storymap.PinTypes.FieldType do
  @moduledoc false

  @field_types ~w(text textarea number boolean select url list music drawing)

  @type t :: String.t()

  @spec values() :: [t()]
  def values, do: @field_types

  @spec field_type_label(String.t()) :: String.t()
  def field_type_label("text"), do: "Text"
  def field_type_label("textarea"), do: "Long text"
  def field_type_label("number"), do: "Number"
  def field_type_label("boolean"), do: "Yes/No"
  def field_type_label("select"), do: "Dropdown"
  def field_type_label("url"), do: "Link"
  def field_type_label("list"), do: "List of text"
  def field_type_label("music"), do: "Music"
  def field_type_label("drawing"), do: "Drawing"
  def field_type_label(type), do: type
end
