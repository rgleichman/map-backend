defmodule Storymap.PinTypes.Policy do
  @moduledoc false

  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.PinTypes.CustomPinType

  def can_create?(%User{} = user), do: not AccountsPolicy.muted?(user)
  def can_create?(_), do: false

  def can_edit?(%User{} = user, %CustomPinType{} = pin_type) do
    if AccountsPolicy.muted?(user) do
      false
    else
      can_edit_unmuted?(user, pin_type)
    end
  end

  def can_edit?(_, _), do: false

  def can_delete?(%User{} = user, %CustomPinType{} = pin_type), do: can_edit?(user, pin_type)
  def can_delete?(_, _), do: false

  defp can_edit_unmuted?(%User{id: user_id, admin_level: level}, %CustomPinType{
         created_by_user_id: creator_id
       }) do
    creator_id == user_id or (is_integer(level) and level >= 1)
  end
end
