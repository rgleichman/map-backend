defmodule Storymap.Pins.Policy do
  @moduledoc """
  Site-level authorization for world-map pins and catalog helpers.

  - `authorize_create/1`, `authorize_update/2`, and `authorize_delete/2` apply to
    pins without a sub-map (`sub_map_id` is nil). API controllers call
    `Storymap.Pins.Authorizer` instead, which delegates world-map mutations here
    and adds sub-map rules.
  - `catalog_admin?/1` and `owner_or_admin?/2` are used by the pin catalog LiveView
    and JSON views.
  """

  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin
  alias Storymap.Types

  @pin_moderator_admin_level 1
  @pin_catalog_admin_level 10

  @doc """
  Authorizes creating a pin. Returns `{:error, :forbidden}` when the user is muted.
  """
  @spec authorize_create(User.t()) :: Types.authorize_result()
  def authorize_create(%User{} = user) do
    if muted?(user), do: {:error, :forbidden}, else: :ok
  end

  @doc """
  Authorizes updating a pin. Muted users and non-owners without moderator admin are forbidden.
  """
  @spec authorize_update(User.t(), Pin.t()) :: Types.authorize_result()
  def authorize_update(%User{} = user, %Pin{} = pin) do
    cond do
      muted?(user) -> {:error, :forbidden}
      can_modify_pin?(user, pin) -> :ok
      true -> {:error, :forbidden}
    end
  end

  @doc """
  Authorizes deleting a pin. Same rules as update.
  """
  @spec authorize_delete(User.t(), Pin.t()) :: Types.authorize_result()
  def authorize_delete(user, pin), do: authorize_update(user, pin)

  @doc """
  Whether the user may update or delete the pin (owner or pin moderator admin).
  Does not consider mute status.
  """
  @spec can_modify_pin?(User.t(), Pin.t()) :: boolean()
  def can_modify_pin?(%User{id: user_id, admin_level: admin_level}, %Pin{user_id: pin_user_id}) do
    pin_user_id == user_id or admin_level >= @pin_moderator_admin_level
  end

  @doc """
  Whether the authenticated viewer should see `is_owner: true` on a pin in JSON.
  Same ownership rule as `can_modify_pin?/2`.
  """
  @spec owner_or_admin?(User.t(), Pin.t()) :: boolean()
  def owner_or_admin?(%User{} = user, %Pin{} = pin), do: can_modify_pin?(user, pin)

  @doc """
  Whether the user may see pin-owner metadata in the pin catalog (admin level >= 10).
  """
  @spec catalog_admin?(User.t()) :: boolean()
  def catalog_admin?(%User{admin_level: admin_level})
      when is_integer(admin_level) and admin_level >= @pin_catalog_admin_level,
      do: true

  def catalog_admin?(_), do: false

  @doc false
  @spec muted?(User.t()) :: boolean()
  def muted?(%User{} = user), do: AccountsPolicy.muted?(user)
end
