defmodule Storymap.Tags do
  @moduledoc """
  The Tags context.
  """

  import Ecto.Query
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
    lowercase_names =
      names
      |> Enum.map(&String.downcase/1)
      |> Enum.uniq()

    existing =
      from(t in Tag, where: t.name in ^lowercase_names)
      |> Repo.all()
      |> Map.new(&{&1.name, &1})

    missing = lowercase_names -- Map.keys(existing)

    inserted =
      Enum.reduce_while(missing, [], fn name, acc ->
        case %Tag{} |> Tag.changeset(%{name: name}) |> Repo.insert() do
          {:ok, tag} -> {:cont, [tag | acc]}
          {:error, changeset} -> {:halt, {:error, changeset}}
        end
      end)

    case inserted do
      {:error, changeset} ->
        {:error, changeset}

      new_tags ->
        tags =
          lowercase_names
          |> Enum.map(fn name ->
            Map.get(existing, name) || Enum.find(new_tags, &(&1.name == name))
          end)

        {:ok, tags}
    end
  end
end
