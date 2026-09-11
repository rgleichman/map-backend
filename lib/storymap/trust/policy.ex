defmodule Storymap.Trust.Policy do
  @moduledoc """
  Privilege checks based on effective trust. See `docs/TRUST.md` §6.
  """

  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.SubMaps.Membership
  alias Storymap.SubMaps.Policy, as: SubMapPolicy
  alias Storymap.SubMaps.SubMap
  alias Storymap.Trust

  @spec meets_threshold?(User.t() | integer(), float()) :: boolean()
  def meets_threshold?(%User{id: id}, threshold) when is_number(threshold) do
    Trust.effective_trust(id) >= threshold
  end

  def meets_threshold?(user_id, threshold) when is_integer(user_id) and is_number(threshold) do
    Trust.effective_trust(user_id) >= threshold
  end

  @doc """
  Whether the user may create a world pin as `:approved` (vs pending).
  When gates are disabled, always true for non-muted users (caller still checks mute).
  """
  @spec can_direct_world_post?(User.t()) :: boolean()
  def can_direct_world_post?(%User{} = user) do
    if Trust.gates_enabled?() do
      not AccountsPolicy.muted?(user) and
        meets_threshold?(user, Trust.config(:t_world, 0.55))
    else
      not AccountsPolicy.muted?(user)
    end
  end

  @doc """
  Whether the user may approve pending world pins.
  """
  @spec can_approve_world?(User.t()) :: boolean()
  def can_approve_world?(%User{} = user) do
    cond do
      AccountsPolicy.muted?(user) -> false
      site_pin_moderator?(user) -> true
      Trust.gates_enabled?() -> meets_threshold?(user, Trust.config(:t_approve, 0.70))
      true -> false
    end
  end

  @doc """
  Community pin approve: legacy mod/owner/admin **or** (when gates on) trust threshold.
  """
  @spec can_approve_community_pin?(User.t(), SubMap.t(), Membership.t() | nil) :: boolean()
  def can_approve_community_pin?(%User{} = user, %SubMap{} = sub_map, membership) do
    cond do
      AccountsPolicy.muted?(user) ->
        false

      SubMapPolicy.can_moderate?(user, sub_map, membership) ->
        true

      Trust.gates_enabled?() ->
        meets_threshold?(user, Trust.config(:t_approve, 0.70))

      true ->
        false
    end
  end

  @spec can_vouch?(User.t()) :: boolean()
  def can_vouch?(%User{} = user) do
    not AccountsPolicy.muted?(user) and
      meets_threshold?(user, Trust.config(:t_vouch, 0.60))
  end

  defp site_pin_moderator?(%User{admin_level: level}) when is_integer(level) and level >= 1,
    do: true

  defp site_pin_moderator?(_), do: false
end
