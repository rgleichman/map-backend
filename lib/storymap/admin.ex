defmodule Storymap.Admin do
  @moduledoc """
  Admin access helpers. Minimum `admin_level` for admin UI and APIs.
  """

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User

  @min_level 10

  def min_level, do: @min_level

  defguard is_admin_level(level) when is_integer(level) and level >= @min_level

  def admin?(%User{admin_level: level}) when is_admin_level(level), do: true
  def admin?(_), do: false

  def admin_scope?(%Scope{user: user}), do: admin?(user)
  def admin_scope?(_), do: false
end
