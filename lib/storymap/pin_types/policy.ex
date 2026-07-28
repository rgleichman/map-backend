defmodule Storymap.PinTypes.Policy do
  @moduledoc false

  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.PinTypes.PinType

  @spec can_create?(term()) :: boolean()
  def can_create?(%User{} = user) do
    AccountsPolicy.authorize_write?(user) == :ok
  end

  def can_create?(_), do: false

  @spec can_edit?(term(), term()) :: boolean()
  def can_edit?(%User{} = user, %PinType{} = pin_type) do
    if AccountsPolicy.muted?(user) do
      false
    else
      can_edit_unmuted?(user, pin_type)
    end
  end

  def can_edit?(_, _), do: false

  @doc """
  System types are part of the catalog baseline and can never be deleted.
  """
  @spec can_delete?(term(), term()) :: boolean()
  def can_delete?(_user, %PinType{is_system: true}), do: false
  def can_delete?(%User{} = user, %PinType{} = pin_type), do: can_edit?(user, pin_type)
  def can_delete?(_, _), do: false

  defp can_edit_unmuted?(%User{id: user_id, admin_level: level}, %PinType{
         created_by_user_id: creator_id
       }) do
    creator_id == user_id or level >= 1
  end
end
