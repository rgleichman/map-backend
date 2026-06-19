defmodule Storymap.Accounts.Policy do
  @moduledoc """
  Account-level authorization rules (e.g. mute status).
  """

  alias Storymap.Accounts.User

  @doc false
  def muted?(%User{muted_at: nil}), do: false
  def muted?(%User{muted_at: _}), do: true

  @doc """
  Returns `:ok` when the user may perform content writes, or `{:error, :forbidden}` when muted.
  """
  def authorize_write?(%User{} = user) do
    if muted?(user), do: {:error, :forbidden}, else: :ok
  end
end
