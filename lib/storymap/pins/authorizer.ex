defmodule Storymap.Pins.Authorizer do
  @moduledoc """
  API authorization for pins: composes `Storymap.Pins.Policy` (world-map rules)
  with `Storymap.SubMaps.Policy` (community membership and moderation).

  Controllers should call this module, not `Pins.Policy` directly.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.{Pin, Policy, Visibility}
  alias Storymap.SubMaps
  alias Storymap.SubMaps.SubMap
  alias Storymap.SubMaps.Policy, as: SubMapPolicy
  alias Storymap.SubMaps.Membership
  alias Storymap.Types

  @spec authorize_create(User.t()) :: Types.authorize_result()
  def authorize_create(%User{} = user) do
    Policy.authorize_create(user)
  end

  @spec authorize_create_in_sub_map(User.t(), SubMap.t(), Membership.t() | nil) ::
          Types.authorize_result()
  def authorize_create_in_sub_map(%User{} = user, %SubMap{} = sub_map, membership) do
    case authorize_create(user) do
      {:error, :forbidden} = err ->
        err

      :ok ->
        if SubMapPolicy.can_post?(user, sub_map, membership), do: :ok, else: {:error, :forbidden}
    end
  end

  @spec authorize_update(User.t(), Pin.t(), keyword()) :: Types.authorize_result()
  def authorize_update(%User{} = user, %Pin{} = pin, opts \\ []) do
    if is_nil(pin.sub_map_id) do
      Policy.authorize_update(user, pin)
    else
      authorize_sub_map_update(user, pin, opts)
    end
  end

  @spec authorize_delete(User.t(), Pin.t(), keyword()) :: Types.authorize_result()
  def authorize_delete(%User{} = user, %Pin{} = pin, opts \\ []) do
    if is_nil(pin.sub_map_id) do
      Policy.authorize_delete(user, pin)
    else
      authorize_sub_map_delete(user, pin, opts)
    end
  end

  @spec authorize_show(User.t() | nil, Pin.t(), keyword()) :: :ok | {:error, :not_found}
  def authorize_show(user, %Pin{} = pin, opts \\ []) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    membership = Keyword.get(opts, :membership)

    cond do
      Visibility.world_visible?(pin) ->
        :ok

      match?(%User{}, user) && site_pin_moderator?(user) ->
        :ok

      sub_map &&
        SubMapPolicy.can_view?(sub_map, user, membership) &&
          sub_map_pin_status_visible?(user, pin, sub_map, membership) ->
        :ok

      true ->
        {:error, :not_found}
    end
  end

  @spec can_edit_in_json?(User.t(), Pin.t(), keyword()) :: boolean()
  def can_edit_in_json?(%User{} = user, %Pin{} = pin, opts \\ []) do
    case authorize_update(user, pin, opts) do
      :ok -> true
      {:error, :forbidden} -> false
    end
  end

  @spec authorize_sub_map_update(User.t(), Pin.t(), keyword()) :: Types.authorize_result()
  defp authorize_sub_map_update(%User{} = user, %Pin{} = pin, opts) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    membership = Keyword.get(opts, :membership)

    cond do
      Policy.muted?(user) ->
        {:error, :forbidden}

      site_pin_moderator?(user) ->
        :ok

      sub_map && SubMapPolicy.can_moderate?(user, sub_map, membership) ->
        :ok

      pin.user_id == user.id && owner_can_edit_sub_map_pin?(sub_map, pin) ->
        :ok

      true ->
        {:error, :forbidden}
    end
  end

  @spec authorize_sub_map_delete(User.t(), Pin.t(), keyword()) :: Types.authorize_result()
  defp authorize_sub_map_delete(%User{} = user, %Pin{} = pin, opts) do
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

  @spec sub_map_pin_status_visible?(
          User.t() | nil,
          Pin.t(),
          SubMap.t() | nil,
          Membership.t() | nil
        ) :: boolean()
  defp sub_map_pin_status_visible?(_user, %Pin{status: :approved}, _sub_map, _membership),
    do: true

  defp sub_map_pin_status_visible?(
         %User{} = user,
         %Pin{status: :pending} = pin,
         sub_map,
         membership
       ) do
    SubMapPolicy.can_moderate?(user, sub_map, membership) or pin.user_id == user.id
  end

  defp sub_map_pin_status_visible?(%User{} = user, %Pin{status: status}, sub_map, membership)
       when status in [:rejected, :archived] do
    SubMapPolicy.can_moderate?(user, sub_map, membership)
  end

  defp sub_map_pin_status_visible?(_, _, _, _), do: false

  @spec site_pin_moderator?(User.t()) :: boolean()
  defp site_pin_moderator?(%User{admin_level: level}) when is_integer(level) and level >= 1,
    do: true

  defp site_pin_moderator?(_), do: false

  @spec owner_can_edit_sub_map_pin?(SubMap.t() | nil, Pin.t()) :: boolean()
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
