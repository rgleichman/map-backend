defmodule Storymap.PinTypes.Policy do
  @moduledoc false

  alias Storymap.Accounts.User
  alias Storymap.PinTypes.CustomPinType

  def can_create?(%User{}), do: true
  def can_create?(_), do: false

  def can_edit?(%User{id: user_id, admin_level: level}, %CustomPinType{
        created_by_user_id: creator_id
      }) do
    creator_id == user_id or (is_integer(level) and level >= 1)
  end

  def can_edit?(_, _), do: false

  def can_delete?(%User{} = user, %CustomPinType{} = pin_type), do: can_edit?(user, pin_type)
  def can_delete?(_, _), do: false
end
