defmodule StorymapWeb.AdminReportsChannel do
  use Phoenix.Channel

  alias Storymap.Accounts
  alias Storymap.Accounts.User

  @impl true
  def join("admin:reports", _payload, socket) do
    case socket.assigns[:user_id] do
      user_id when is_integer(user_id) ->
        case Accounts.get_user(user_id) do
          %User{admin_level: admin_level} when admin_level >= 10 ->
            {:ok, socket}

          %User{} ->
            {:error, %{reason: "forbidden"}}

          nil ->
            {:error, %{reason: "unauthorized"}}
        end

      _ ->
        {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_out(event, payload, socket) do
    push(socket, event, payload)
    {:noreply, socket}
  end
end
