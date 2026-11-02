defmodule StorymapWeb.UserSocketTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures

  alias StorymapWeb.MapChannel
  alias StorymapWeb.UserSocket

  defp bare_socket do
    %Phoenix.Socket{
      transport_pid: self(),
      serializer: Jason
    }
  end

  test "connects anonymously when auth token is nil" do
    assert {:ok, socket} = UserSocket.connect(%{}, bare_socket(), %{auth_token: nil})
    refute Map.has_key?(socket.assigns, :user_id)
  end

  test "connects anonymously when auth token is empty" do
    assert {:ok, socket} = UserSocket.connect(%{}, bare_socket(), %{auth_token: ""})
    refute Map.has_key?(socket.assigns, :user_id)
  end

  test "assigns user_id when auth token is valid" do
    user = user_fixture()
    token = Phoenix.Token.sign(StorymapWeb.Endpoint, "user socket", user.id)

    assert {:ok, socket} = UserSocket.connect(%{}, bare_socket(), %{auth_token: token})
    assert socket.assigns.user_id == user.id
  end

  test "connects anonymously when auth token is invalid so world channel remains joinable" do
    assert {:ok, socket} =
             UserSocket.connect(%{}, bare_socket(), %{auth_token: "not-a-valid-token"})

    refute Map.has_key?(socket.assigns, :user_id)
    assert {:ok, _joined} = MapChannel.join("map:world", %{}, socket)
  end

  test "connects anonymously when auth token is expired so world channel remains joinable" do
    user = user_fixture()

    token =
      Phoenix.Token.sign(StorymapWeb.Endpoint, "user socket", user.id, signed_at: 0)

    assert {:ok, socket} = UserSocket.connect(%{}, bare_socket(), %{auth_token: token})
    refute Map.has_key?(socket.assigns, :user_id)
    assert {:ok, _joined} = MapChannel.join("map:world", %{}, socket)
  end
end
