defmodule StorymapWeb.MapChannelTest do
  use Storymap.DataCase, async: false

  import Storymap.SubMapsFixtures
  import Storymap.AccountsFixtures

  alias StorymapWeb.MapChannel

  defp socket(assigns \\ %{}) do
    %Phoenix.Socket{assigns: assigns}
  end

  test "joins map:world" do
    assert {:ok, _socket} = MapChannel.join("map:world", %{}, socket())
  end

  test "joins map:submap topic for existing community" do
    sub_map = sub_map_fixture(%{"community_url" => "channel-test"})

    assert {:ok, socket} =
             MapChannel.join("map:submap:#{sub_map.community_url}", %{}, socket())

    assert socket.assigns.community_url == sub_map.community_url
  end

  test "rejects unknown community" do
    assert {:error, %{reason: "community not found"}} =
             MapChannel.join("map:submap:missing-community", %{}, socket())
  end

  test "mod channel requires authentication" do
    sub_map = sub_map_fixture(%{"community_url" => "mod-auth-test"})

    assert {:error, %{reason: "unauthorized"}} =
             MapChannel.join("map:submap:#{sub_map.community_url}:mod", %{}, socket())
  end

  test "mod channel rejects non-moderators" do
    sub_map = sub_map_fixture(%{"community_url" => "mod-member-test"})
    member = user_fixture()

    assert {:error, %{reason: "unauthorized"}} =
             MapChannel.join(
               "map:submap:#{sub_map.community_url}:mod",
               %{},
               socket(%{user_id: member.id})
             )
  end

  test "mod channel allows community owner" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"community_url" => "mod-owner-test"}, owner)

    assert {:ok, socket} =
             MapChannel.join(
               "map:submap:#{sub_map.community_url}:mod",
               %{},
               socket(%{user_id: owner.id})
             )

    assert socket.assigns.moderator_channel? == true
    assert socket.assigns.community_url == sub_map.community_url
  end
end
