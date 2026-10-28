defmodule StorymapWeb.PinCommentControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.Pins.PinComment
  alias Storymap.Repo
  alias StorymapWeb.JSON.DateTime, as: JSONDateTime

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "index" do
    test "lists comments for a visible pin", %{conn: conn} do
      pin = pin_fixture()
      comment = pin_comment_fixture(%{"body" => "Hello"}, pin)

      conn = get(conn, ~p"/api/pins/#{pin.id}/comments")
      assert [data] = json_response(conn, 200)["data"]
      assert data["body"] == "Hello"
      assert data["inserted_at"] == JSONDateTime.to_iso8601(comment.inserted_at)
      assert data["updated_at"] == JSONDateTime.to_iso8601(comment.updated_at)
    end

    test "returns 404 for hidden pin", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = user_fixture()
      sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Hidden",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Storymap.Repo.update!(Ecto.Changeset.change(pin, status: :rejected))

      conn = get(conn, ~p"/api/pins/#{pin.id}/comments")
      assert json_response(conn, 404)
    end
  end

  describe "create" do
    setup :register_and_log_in_user

    test "creates a comment", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/comments", %{
          comment: %{body: "New comment"}
        })

      data = json_response(conn, 201)["data"]

      assert %{
               "id" => id,
               "body" => "New comment",
               "is_author" => true,
               "deleted" => false,
               "held_for_moderation" => false
             } = data

      comment = Repo.get!(PinComment, id)
      assert data["inserted_at"] == JSONDateTime.to_iso8601(comment.inserted_at)
      assert data["updated_at"] == JSONDateTime.to_iso8601(comment.updated_at)
    end

    test "holds flagged comments and exposes held_for_moderation", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/comments", %{
          comment: %{body: "zzhatephrase is bad"}
        })

      assert %{
               "deleted" => true,
               "held_for_moderation" => true,
               "body" => "",
               "is_author" => true
             } = json_response(conn, 201)["data"]
    end

    test "returns 401 when unauthenticated", %{conn: conn} do
      pin = pin_fixture()
      conn = recycle(conn) |> delete_req_header("authorization")

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/comments", %{
          comment: %{body: "Nope"}
        })

      assert json_response(conn, 401)
    end

    test "forbids muted user", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/comments", %{
          comment: %{body: "Muted"}
        })

      assert json_response(conn, 403)
    end
  end

  describe "update" do
    setup :register_and_log_in_user

    test "updates own comment", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      comment = pin_comment_fixture(%{"body" => "Old"}, pin, user)

      conn =
        patch(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}", %{
          comment: %{body: "Updated"}
        })

      assert %{"body" => "Updated"} = json_response(conn, 200)["data"]
    end

    test "forbids updating another user's comment", %{conn: conn} do
      author = user_fixture()
      pin = pin_fixture(%{}, author)
      comment = pin_comment_fixture(%{"body" => "Mine"}, pin, author)

      conn =
        patch(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}", %{
          comment: %{body: "Stolen"}
        })

      assert json_response(conn, 403)
    end
  end

  describe "delete" do
    setup :register_and_log_in_user

    test "soft deletes own comment", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      comment = pin_comment_fixture(%{}, pin, user)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}")
      assert %{"deleted" => true} = json_response(conn, 200)["data"]
    end

    test "plant owner deletes another user's comment", %{conn: conn, user: owner} do
      commenter = user_fixture()
      pin = pin_fixture(%{}, owner)
      comment = pin_comment_fixture(%{}, pin, commenter)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}")
      assert %{"deleted" => true} = json_response(conn, 200)["data"]
    end

    test "site pin moderator deletes another user's comment", %{conn: conn} do
      author = user_fixture()
      pin = pin_fixture(%{}, author)
      comment = pin_comment_fixture(%{}, pin, author)
      admin = user_fixture(%{admin_level: 1})
      conn = log_in_user(conn, admin)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}")
      assert %{"deleted" => true} = json_response(conn, 200)["data"]
    end

    test "garden moderator deletes another user's comment", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = user_fixture()
      commenter = user_fixture()
      moderator = user_fixture()

      sub_map =
        sub_map_fixture(%{"community_url" => "comment-delete-mod"}, owner)

      {:ok, _} =
        Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: commenter}, sub_map)

      {:ok, membership} =
        Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: moderator}, sub_map)

      membership
      |> Storymap.SubMaps.Membership.changeset(%{"role" => "moderator"})
      |> Storymap.Repo.update!()

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      comment = pin_comment_fixture(%{}, pin, commenter)
      conn = log_in_user(conn, moderator)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}")
      assert %{"deleted" => true} = json_response(conn, 200)["data"]
    end

    test "forbids garden member from deleting another user's comment", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = user_fixture()
      commenter = user_fixture()
      member = user_fixture()

      sub_map =
        sub_map_fixture(%{"community_url" => "comment-delete-member"}, owner)

      {:ok, _} =
        Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: commenter}, sub_map)

      {:ok, _} =
        Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: member}, sub_map)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      comment = pin_comment_fixture(%{}, pin, commenter)
      conn = log_in_user(conn, member)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/comments/#{comment.id}")
      assert json_response(conn, 403)
    end
  end
end
