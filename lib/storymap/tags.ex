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
    lowercase_name = String.downcase(name)

    case Repo.get_by(Tag, name: lowercase_name) do
      nil ->
        %Tag{}
        |> Tag.changeset(%{name: lowercase_name})
        |> Repo.insert()

      tag ->
        {:ok, tag}
    end
  end

  @doc """
  Gets all tags for a list of names.
  Returns `{:ok, [%Tag{}]}` or `{:error, changeset}` if any tag creation fails.
  """
  def get_or_create_tags_by_names(names) do
    names
    |> Enum.map(&get_or_create_tag_by_name/1)
    |> Enum.reduce_while([], fn
      {:ok, tag}, acc -> {:cont, [tag | acc]}
      {:error, changeset}, _acc -> {:halt, {:error, changeset}}
    end)
    |> case do
      {:error, changeset} -> {:error, changeset}
      tags -> {:ok, Enum.reverse(tags)}
    end
  end
end
