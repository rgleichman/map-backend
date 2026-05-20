defmodule StorymapWeb.ChannelCase do
  @moduledoc """
  Test case for Phoenix channels.

  Builds a `UserSocket` test socket with `:user_id` assigned, matching production
  channel auth (see `StorymapWeb.UserSocket.connect/3`).
  """

  use ExUnit.CaseTemplate

  import Phoenix.ChannelTest

  using do
    quote do
      import Phoenix.ChannelTest

      alias Storymap.Repo
      alias StorymapWeb.UserSocket

      @endpoint StorymapWeb.Endpoint

      @doc false
      def socket_for_user(user) do
        socket(UserSocket, nil, %{})
        |> Phoenix.Socket.assign(:user_id, user.id)
      end
    end
  end

  setup tags do
    Storymap.DataCase.setup_sandbox(tags)
    :ok
  end
end
