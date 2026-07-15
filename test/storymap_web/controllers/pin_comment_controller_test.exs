defmodule StorymapWeb.PinCommentControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "index" do
    test "lists comments for a visible pin", %{conn: conn} do
      pin = pin_fixture()
      pin_comment_fixture(%{"body" => "Hello"}, pin)

      conn = get(conn, ~p"/api/pins/#{pin.id}/comments")
      assert [%{"body" => "Hello"}] = json_response(conn, 200)["data"]
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

      assert %{"body" => "New comment", "is_author" => true} = json_response(conn, 201)["data"]
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
  end
end
