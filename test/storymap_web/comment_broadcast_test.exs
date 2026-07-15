defmodule StorymapWeb.CommentBroadcastTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins.Comments
  alias Storymap.Repo
  alias Storymap.SubMaps
  alias StorymapWeb.{CommentBroadcast, Endpoint}

  test "broadcast_comment_event/3 sends comment_added to world for world-visible pin" do
    pin = pin_fixture()
    user = user_fixture()
    {:ok, comment} = Comments.create_comment(pin, user, %{"body" => "Hi"})
    :ok = Endpoint.subscribe("map:world")

    assert :ok = CommentBroadcast.broadcast_comment_event(pin, comment, :created)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "map:world",
      event: "comment_added",
      payload: %{pin_id: pin_id, comment: %{body: "Hi"}}
    }

    assert pin_id == pin.id
  end

  test "broadcast_comment_event/3 sends to sub-map topic for community pin" do
    owner = user_fixture()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "comment-broadcast", "promote_to_world_default" => "never"},
        owner
      )

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Local",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    pin = Repo.preload(pin, :sub_map)
    {:ok, comment} = Comments.create_comment(pin, owner, %{"body" => "Local comment"})
    :ok = Endpoint.subscribe("map:submap:comment-broadcast")

    assert :ok = CommentBroadcast.broadcast_comment_event(pin, comment, :created)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "map:submap:comment-broadcast",
      event: "comment_added",
      payload: %{pin_id: pin_id}
    }

    assert pin_id == pin.id
  end

  test "broadcast_comment_event/3 sends comment_deleted payload" do
    pin = pin_fixture()
    user = user_fixture()
    comment = pin_comment_fixture(%{}, pin, user)
    {:ok, deleted} = Comments.delete_comment(comment)
    :ok = Endpoint.subscribe("map:world")

    assert :ok = CommentBroadcast.broadcast_comment_event(pin, deleted, :deleted)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "map:world",
      event: "comment_deleted",
      payload: %{pin_id: pin_id, comment_id: comment_id, parent_id: nil}
    }

    assert pin_id == pin.id
    assert comment_id == comment.id
  end
end
