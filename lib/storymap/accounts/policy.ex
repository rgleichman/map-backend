defmodule Storymap.Accounts.Policy do
  @moduledoc """
  Account-level authorization rules (e.g. mute status).
  """

  alias Storymap.Accounts.User
  alias Storymap.Types

  @doc false
  @spec muted?(User.t()) :: boolean()
  def muted?(%User{muted_at: nil}), do: false
  def muted?(%User{muted_at: _}), do: true

  @doc """
  Returns `:ok` when the user may perform content writes, or `{:error, :forbidden}` when muted.
  """
  @spec authorize_write?(User.t()) :: Types.authorize_result()
  def authorize_write?(%User{} = user) do
    if muted?(user), do: {:error, :forbidden}, else: :ok
  end
end
