defmodule Storymap.SubMaps.Policy do
  @moduledoc """
  Authorization for sub-map membership, posting, and moderation.
  """
  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.SubMaps.{Membership, SubMap}

  def can_view?(%SubMap{visibility: "public"}, _user, _membership), do: true
  def can_view?(%SubMap{visibility: "unlisted"}, _user, _membership), do: true

  def can_moderate?(%User{} = user, %SubMap{} = sub_map, membership) do
    if AccountsPolicy.muted?(user) do
      false
    else
      site_admin?(user) or mod_role?(membership) or owner?(sub_map, user)
    end
  end

  def can_moderate?(_, _, _), do: false

  def can_edit_sub_map?(%User{} = user, %SubMap{owner_user_id: owner_id}) do
    if AccountsPolicy.muted?(user) do
      false
    else
      user.id == owner_id or site_admin?(user)
    end
  end

  def can_post?(%User{} = user, %SubMap{} = sub_map, membership) do
    cond do
      AccountsPolicy.muted?(user) -> false
      site_admin?(user) -> true
      sub_map.contribution_mode == "members_only" -> active_member?(membership)
      true -> true
    end
  end

  def can_post?(_, _, _), do: false

  def can_set_visible_on_world?(%SubMap{promote_to_world_default: "never"}, _user, _membership),
    do: false

  def can_set_visible_on_world?(
        %SubMap{promote_to_world_default: "always"} = sub_map,
        user,
        membership
      ) do
    can_moderate?(user, sub_map, membership)
  end

  def can_set_visible_on_world?(
        %SubMap{promote_to_world_default: "ask"} = sub_map,
        user,
        membership
      ) do
    can_moderate?(user, sub_map, membership) or can_post?(user, sub_map, membership)
  end

  def can_set_visible_on_world?(_, _, _), do: false

  def promotion_default_visible?(%SubMap{promote_to_world_default: "always"}), do: true
  def promotion_default_visible?(%SubMap{promote_to_world_default: "never"}), do: false
  def promotion_default_visible?(%SubMap{promote_to_world_default: "ask"}), do: false

  def mod_role?(%Membership{role: role, status: "active"})
      when role in ["owner", "moderator"],
      do: true

  def mod_role?(_), do: false

  def active_member?(%Membership{status: "active"}), do: true
  def active_member?(_), do: false

  def owner?(%SubMap{owner_user_id: owner_id}, %User{id: user_id}), do: owner_id == user_id

  defp site_admin?(%User{admin_level: level}) when is_integer(level) and level >= 1, do: true
  defp site_admin?(_), do: false
end
