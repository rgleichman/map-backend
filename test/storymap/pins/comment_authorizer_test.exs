defmodule Storymap.Pins.CommentAuthorizerTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins.CommentAuthorizer
  alias Storymap.Pins.PinComment
  alias Storymap.Repo
  alias Storymap.SubMaps

  describe "authorize_create/3" do
    setup do
      pin = pin_fixture()
      %{pin: pin}
    end

    test "allows logged-in user on visible pin", %{pin: pin} do
      user = user_fixture()
      assert :ok = CommentAuthorizer.authorize_create(user, pin, [])
    end

    test "forbids muted user", %{pin: pin} do
      muted = muted_user_fixture()
      assert {:error, :forbidden} = CommentAuthorizer.authorize_create(muted, pin, [])
    end
  end

  describe "authorize_update/2" do
    setup do
      author = user_fixture()
      other = user_fixture()
      pin = pin_fixture(%{}, author)
      comment = insert_comment!(pin, author)
      %{author: author, other: other, comment: comment}
    end

    test "allows comment author", %{author: author, comment: comment} do
      assert :ok = CommentAuthorizer.authorize_update(author, comment, [])
    end

    test "forbids non-author", %{other: other, comment: comment} do
      assert {:error, :forbidden} = CommentAuthorizer.authorize_update(other, comment, [])
    end
  end

  describe "authorize_delete/4 world pin" do
    setup do
      author = user_fixture()
      admin = user_fixture(%{admin_level: 1})
      pin = pin_fixture(%{}, author)
      comment = insert_comment!(pin, author)
      %{author: author, admin: admin, pin: pin, comment: comment}
    end

    test "allows comment author", %{author: author, pin: pin, comment: comment} do
      assert :ok = CommentAuthorizer.authorize_delete(author, pin, comment, [])
    end

    test "allows site pin moderator", %{admin: admin, pin: pin, comment: comment} do
      assert :ok = CommentAuthorizer.authorize_delete(admin, pin, comment, [])
    end
  end

  describe "authorize_delete/4 sub-map" do
    setup do
      owner = user_fixture()
      commenter = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "comment-mod"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, owner.id)

      %{
        owner: owner,
        commenter: commenter,
        sub_map: sub_map,
        pin: pin,
        membership: membership
      }
    end

    test "allows sub-map owner to delete another user's comment", %{
      owner: owner,
      commenter: commenter,
      sub_map: sub_map,
      pin: pin,
      membership: membership
    } do
      comment = insert_comment!(pin, commenter)

      assert :ok =
               CommentAuthorizer.authorize_delete(owner, pin, comment,
                 sub_map: sub_map,
                 membership: membership
               )
    end
  end

  defp insert_comment!(pin, user) do
    %PinComment{}
    |> PinComment.create_changeset(%{"body" => "x"},
      pin_id: pin.id,
      user_id: user.id,
      parent: nil
    )
    |> Repo.insert!()
  end
end
