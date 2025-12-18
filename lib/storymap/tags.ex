defmodule Storymap.Tags do
  @moduledoc """
  The Tags context.
  """

  import Ecto.Query, warn: false
  alias Storymap.Repo
  alias Storymap.Tags.Tag

  @doc """
  Gets a tag by name, or creates it if it doesn't exist.
  """
  def get_or_create_tag_by_name(name) do
    case Repo.get_by(Tag, name: name) do
      nil ->
        %Tag{}
        |> Tag.changeset(%{name: name})
        |> Repo.insert()
      tag ->
        {:ok, tag}
    end
  end

  @doc """
  Gets all tags for a list of names.
  """
  def get_or_create_tags_by_names(names) do
    names
    |> Enum.map(&get_or_create_tag_by_name/1)
    |> Enum.map(fn
      {:ok, tag} -> tag
      tag -> tag
    end)
  end
end
