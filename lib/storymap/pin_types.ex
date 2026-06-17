defmodule Storymap.PinTypes do
  @moduledoc """
  Global custom pin type catalog.
  """

  import Ecto.Query

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin
  alias Storymap.PinTypes.{CustomPinType, Policy}
  alias Storymap.Repo
  alias Storymap.SubMaps.PinTypeSettings

  def list_enabled_pin_types do
    CustomPinType
    |> where([t], t.enabled == true)
    |> order_by([t], asc: t.label)
    |> Repo.all()
  end

  def list_all_pin_types do
    CustomPinType
    |> order_by([t], asc: t.label)
    |> Repo.all()
  end

  def get_pin_type!(id), do: Repo.get!(CustomPinType, id)

  def get_by_slug(slug) when is_binary(slug) do
    Repo.get_by(CustomPinType, slug: slug)
  end

  def get_by_slug(_), do: nil

  def get_by_pin_type("custom:" <> slug) when slug != "", do: get_by_slug(slug)
  def get_by_pin_type(_), do: nil

  def create_pin_type(%Scope{user: %User{} = user}, attrs) do
    attrs = stringify_keys(attrs)

    %CustomPinType{created_by_user_id: user.id}
    |> CustomPinType.changeset(attrs)
    |> Repo.insert()
  end

  def create_pin_type(_, _), do: {:error, :unauthorized}

  def update_pin_type(%Scope{user: user}, %CustomPinType{} = pin_type, attrs) do
    if Policy.can_edit?(user, pin_type) do
      pin_type
      |> CustomPinType.changeset(stringify_keys(attrs))
      |> Repo.update()
    else
      {:error, :forbidden}
    end
  end

  def delete_pin_type(%Scope{user: user}, %CustomPinType{} = pin_type) do
    if Policy.can_delete?(user, pin_type) do
      if pin_type_in_use?(pin_type) do
        {:error, :in_use}
      else
        Repo.delete(pin_type)
      end
    else
      {:error, :forbidden}
    end
  end

  def available_pin_types_for_settings(settings) do
    enabled_slugs = PinTypeSettings.enabled_custom_slugs(settings)

    list_enabled_pin_types()
    |> Enum.filter(&(&1.slug in enabled_slugs))
  end

  def available_pin_types_for_world do
    list_enabled_pin_types()
  end

  def change_pin_type(%CustomPinType{} = pin_type, attrs \\ %{}) do
    CustomPinType.changeset(pin_type, attrs)
  end

  defp pin_type_in_use?(%CustomPinType{slug: slug}) do
    pin_type = CustomPinType.pin_type_value(slug)

    Repo.exists?(from p in Pin, where: p.pin_type == ^pin_type)
  end

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
