defmodule StorymapWeb.ConnAuth do
  @moduledoc """
  Shared helpers for reading the optional authenticated user from a Plug connection.
  """

  @spec current_user(Plug.Conn.t()) :: Storymap.Accounts.User.t() | nil
  def current_user(%Plug.Conn{} = conn) do
    case conn.assigns[:current_scope] do
      %{user: %{} = user} -> user
      _ -> nil
    end
  end
end
