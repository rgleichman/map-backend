defmodule Storymap.Pins.Authorizer do
  @moduledoc """
  Composes pin-level and sub-map-level authorization.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.{Pin, Policy}
  alias Storymap.SubMaps
  alias Storymap.SubMaps.SubMap
  alias Storymap.SubMaps.Policy, as: SubMapPolicy

  def authorize_create(%User{} = user) do
    Policy.authorize_create(user)
  end

  def authorize_create_in_sub_map(%User{} = user, %SubMap{} = sub_map, membership) do
    case authorize_create(user) do
      {:error, :forbidden} = err ->
        err

      :ok ->
        if SubMapPolicy.can_post?(user, sub_map, membership), do: :ok, else: {:error, :forbidden}
    end
  end

  def authorize_update(%User{} = user, %Pin{} = pin, opts \\ []) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    membership = Keyword.get(opts, :membership)

    cond do
      Policy.muted?(user) ->
        {:error, :forbidden}

      site_pin_moderator?(user) ->
        :ok

      sub_map && SubMapPolicy.can_moderate?(user, sub_map, membership) ->
        :ok

      is_nil(pin.sub_map_id) && pin.user_id == user.id ->
        :ok

      pin.sub_map_id && pin.user_id == user.id &&
          owner_can_edit_sub_map_pin?(sub_map, pin) ->
        :ok

      true ->
        {:error, :forbidden}
    end
  end

  def authorize_delete(%User{} = user, %Pin{} = pin, opts \\ []) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    membership = Keyword.get(opts, :membership)

    cond do
      Policy.muted?(user) ->
        {:error, :forbidden}

      site_pin_moderator?(user) ->
        :ok

      sub_map && SubMapPolicy.can_moderate?(user, sub_map, membership) ->
        :ok

      pin.user_id == user.id ->
        :ok

      true ->
        {:error, :forbidden}
    end
  end

  def can_edit_in_json?(%User{} = user, %Pin{} = pin, opts \\ []) do
    case authorize_update(user, pin, opts) do
      :ok -> true
      {:error, :forbidden} -> false
    end
  end

  defp site_pin_moderator?(%User{admin_level: level}) when is_integer(level) and level >= 1,
    do: true

  defp site_pin_moderator?(_), do: false

  defp owner_can_edit_sub_map_pin?(%SubMap{contribution_mode: :approval_required}, %Pin{
         status: :pending
       }),
       do: true

  defp owner_can_edit_sub_map_pin?(%SubMap{contribution_mode: :approval_required}, _pin),
    do: false

  defp owner_can_edit_sub_map_pin?(%SubMap{}, %Pin{status: status})
       when status in [:pending, :approved],
       do: true

  defp owner_can_edit_sub_map_pin?(_, _), do: false
end
