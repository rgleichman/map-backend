defmodule StorymapWeb.AccountHelpers do
  @moduledoc false

  alias Storymap.Accounts.Policy
  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User

  @spec user_can_write?(Scope.t() | term()) :: boolean()
  def user_can_write?(%Scope{user: %User{} = user}), do: Policy.authorize_write?(user) == :ok
  def user_can_write?(_), do: false
end
