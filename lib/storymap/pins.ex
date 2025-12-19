defmodule Storymap.Pins do
  @moduledoc """
  The Pins context.
  """

  import Ecto.Query, warn: false
  alias Storymap.Repo

  alias Storymap.Pins.Pin

  @doc """
  Returns the list of pins.

  ## Examples

      iex> list_pins()
      [%Pin{}, ...]

  """

  def list_pins do
    Repo.all(from p in Pin, preload: [:tags])
  end

  def list_pins(current_user_id) do
    Repo.all(from p in Pin, select: %{
      id: p.id, title: p.title, latitude: p.latitude, longitude: p.longitude,
      user_id: p.user_id, description: p.description, icon_url: p.icon_url})
    |> Enum.map(fn pin ->
      Map.put(pin, :is_owner, pin.user_id == current_user_id)
    end)
  end

  @doc """
  Gets a single pin.

  Raises `Ecto.NoResultsError` if the Pin does not exist.

  ## Examples

      iex> get_pin!(123)
      %Pin{}

      iex> get_pin!(456)
      ** (Ecto.NoResultsError)

  """
  def get_pin!(id), do: Repo.get!(Pin, id) |> Repo.preload(:tags)

  @doc """
  Creates a pin.

  ## Examples

      iex> create_pin(%{field: value}, user_id)
      {:ok, %Pin{}}

      iex> create_pin(%{field: bad_value}, user_id)
      {:error, %Ecto.Changeset{}}

  """
  def create_pin(attrs, user_id) do
    attrs_with_user = Map.put(attrs, "user_id", user_id)
    tags = Map.get(attrs, "tags", [])
    tag_structs = Storymap.Tags.get_or_create_tags_by_names(tags)
    %Pin{}
    |> Pin.changeset(attrs_with_user)
    |> Ecto.Changeset.put_assoc(:tags, tag_structs)
    |> Repo.insert()
  end

  @doc """
  Updates a pin.

  ## Examples

      iex> update_pin(pin, %{field: new_value})
      {:ok, %Pin{}}

      iex> update_pin(pin, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_pin(%Pin{} = pin, attrs) do
    tags = Map.get(attrs, "tags", [])
    tag_structs = Storymap.Tags.get_or_create_tags_by_names(tags)
    pin
    |> Pin.changeset(attrs)
    |> Ecto.Changeset.put_assoc(:tags, tag_structs)
    |> Repo.update()
  end

  @doc """
  Deletes a pin.

  ## Examples

      iex> delete_pin(pin)
      {:ok, %Pin{}}

      iex> delete_pin(pin)
      {:error, %Ecto.Changeset{}}

  """
  def delete_pin(%Pin{} = pin) do
    Repo.delete(pin)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking pin changes.

  ## Examples

      iex> change_pin(pin)
      %Ecto.Changeset{data: %Pin{}}

  """
  def change_pin(%Pin{} = pin, attrs \\ %{}) do
    Pin.changeset(pin, attrs)
  end
end
