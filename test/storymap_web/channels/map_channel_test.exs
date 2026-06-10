defmodule StorymapWeb.MapChannelTest do
  use Storymap.DataCase, async: false

  import Storymap.SubMapsFixtures

  alias StorymapWeb.MapChannel

  test "joins map:world" do
    assert {:ok, _socket} = MapChannel.join("map:world", %{}, %Phoenix.Socket{})
  end

  test "joins map:submap topic for existing community" do
    sub_map = sub_map_fixture(%{"community_url" => "channel-test"})

    assert {:ok, socket} =
             MapChannel.join("map:submap:#{sub_map.community_url}", %{}, %Phoenix.Socket{})

    assert socket.assigns.community_url == sub_map.community_url
  end

  test "rejects unknown community" do
    assert {:error, %{reason: "community not found"}} =
             MapChannel.join("map:submap:missing-community", %{}, %Phoenix.Socket{})
  end
end
