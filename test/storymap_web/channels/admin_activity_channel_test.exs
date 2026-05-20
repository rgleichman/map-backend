defmodule StorymapWeb.AdminActivityChannelTest do
  use StorymapWeb.ChannelCase, async: true

  import Storymap.AccountsFixtures

  alias Storymap.Notifications
  alias Storymap.Repo
  alias StorymapWeb.AdminActivityChannel
  alias StorymapWeb.UserSocket

  describe "join/3" do
    test "allows admin users" do
      admin = admin_fixture()

      assert {:ok, _reply, _socket} =
               subscribe_and_join(socket_for_user(admin), AdminActivityChannel, "admin:activity")
    end

    test "rejects non-admin users" do
      user = user_fixture()

      assert {:error, %{reason: "forbidden"}} =
               subscribe_and_join(socket_for_user(user), AdminActivityChannel, "admin:activity")
    end

    test "rejects sockets without user_id" do
      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(
                 socket(UserSocket, nil, %{}),
                 AdminActivityChannel,
                 "admin:activity"
               )
    end
  end

  describe "handle_out/3" do
    test "pushes new_event when Notifications broadcasts to the topic" do
      admin = admin_fixture()

      {:ok, _, socket} =
        subscribe_and_join(socket_for_user(admin), AdminActivityChannel, "admin:activity")

      Notifications.admin_activity_new_event(42)

      assert_push "new_event", %{event_id: 42}
      assert Process.alive?(socket.channel_pid)
    end
  end

  defp admin_fixture do
    user_fixture()
    |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
  end
end
