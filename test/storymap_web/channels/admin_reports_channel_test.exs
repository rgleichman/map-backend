defmodule StorymapWeb.AdminReportsChannelTest do
  use StorymapWeb.ChannelCase, async: true

  import Storymap.AccountsFixtures

  alias Storymap.Notifications
  alias Storymap.Repo
  alias StorymapWeb.AdminReportsChannel
  alias StorymapWeb.UserSocket

  describe "join/3" do
    test "allows admin users" do
      admin = admin_fixture()

      assert {:ok, _reply, _socket} =
               subscribe_and_join(socket_for_user(admin), AdminReportsChannel, "admin:reports")
    end

    test "rejects non-admin users" do
      user = user_fixture()

      assert {:error, %{reason: "forbidden"}} =
               subscribe_and_join(socket_for_user(user), AdminReportsChannel, "admin:reports")
    end

    test "rejects sockets without user_id" do
      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(
                 socket(UserSocket, nil, %{}),
                 AdminReportsChannel,
                 "admin:reports"
               )
    end
  end

  describe "handle_out/3" do
    test "pushes counts_changed when Notifications broadcasts to the topic" do
      admin = admin_fixture()

      {:ok, _, socket} =
        subscribe_and_join(socket_for_user(admin), AdminReportsChannel, "admin:reports")

      Notifications.admin_reports_counts_changed()

      assert_push "counts_changed", %{}
      assert Process.alive?(socket.channel_pid)
    end
  end

  defp admin_fixture do
    user_fixture()
    |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
  end
end
