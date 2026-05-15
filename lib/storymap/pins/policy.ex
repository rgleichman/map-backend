defmodule Storymap.Pins.Policy do
  @moduledoc """
  Authorization rules for pin create, update, and delete.

  Used by `StorymapWeb.PinController`, `StorymapWeb.PinLive.Index`, and
  `StorymapWeb.PinJSON` so ownership and admin checks stay in one place.
  """

  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin

  @pin_moderator_admin_level 1
  @pin_catalog_admin_level 10

  @doc """
  Authorizes creating a pin. Returns `{:error, :forbidden}` when the user is muted.
  """
  def authorize_create(%User{} = user) do
    if muted?(user), do: {:error, :forbidden}, else: :ok
  end

  @doc """
  Authorizes updating a pin. Muted users and non-owners without moderator admin are forbidden.
  """
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
  def authorize_delete(user, pin), do: authorize_update(user, pin)

  @doc """
  Whether the user may update or delete the pin (owner or pin moderator admin).
  Does not consider mute status.
  """
  def can_modify_pin?(%User{id: user_id, admin_level: admin_level}, %Pin{user_id: pin_user_id}) do
    pin_user_id == user_id or admin_level >= @pin_moderator_admin_level
  end

  @doc """
  Whether the authenticated viewer should see `is_owner: true` on a pin in JSON.
  Same ownership rule as `can_modify_pin?/2`.
  """
  def owner_or_admin?(%User{} = user, %Pin{} = pin), do: can_modify_pin?(user, pin)

  @doc """
  Whether the user may see pin-owner metadata in the pin catalog (admin level >= 10).
  """
  def catalog_admin?(%User{admin_level: admin_level})
      when is_integer(admin_level) and admin_level >= @pin_catalog_admin_level,
      do: true

  def catalog_admin?(_), do: false

  @doc false
  def muted?(%User{muted_at: nil}), do: false
  def muted?(%User{muted_at: _}), do: true
end
