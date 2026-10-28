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
  alias Storymap.SubMaps.Membership

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
      owner = user_fixture()
      commenter = user_fixture()
      admin = user_fixture(%{admin_level: 1})
      stranger = user_fixture()
      pin = pin_fixture(%{}, owner)
      comment = insert_comment!(pin, commenter)

      %{
        owner: owner,
        commenter: commenter,
        admin: admin,
        stranger: stranger,
        pin: pin,
        comment: comment
      }
    end

    test "allows comment author", %{commenter: commenter, pin: pin, comment: comment} do
      assert :ok = CommentAuthorizer.authorize_delete(commenter, pin, comment, [])
    end

    test "allows site pin moderator", %{admin: admin, pin: pin, comment: comment} do
      assert :ok = CommentAuthorizer.authorize_delete(admin, pin, comment, [])
    end

    test "allows pin owner to delete another user's comment", %{
      owner: owner,
      pin: pin,
      comment: comment
    } do
      assert :ok = CommentAuthorizer.authorize_delete(owner, pin, comment, [])
    end

    test "forbids a stranger", %{stranger: stranger, pin: pin, comment: comment} do
      assert {:error, :forbidden} =
               CommentAuthorizer.authorize_delete(stranger, pin, comment, [])
    end
  end

  describe "authorize_delete/4 sub-map" do
    setup do
      owner = user_fixture()
      commenter = user_fixture()
      moderator = user_fixture()
      member = user_fixture()

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

      {:ok, _} = SubMaps.join(%Scope{user: commenter}, sub_map)
      {:ok, _} = SubMaps.join(%Scope{user: member}, sub_map)
      {:ok, mod_membership} = SubMaps.join(%Scope{user: moderator}, sub_map)

      mod_membership =
        mod_membership
        |> Membership.changeset(%{"role" => "moderator"})
        |> Repo.update!()

      %{
        owner: owner,
        commenter: commenter,
        moderator: moderator,
        member: member,
        sub_map: sub_map,
        pin: pin,
        owner_membership: SubMaps.get_membership(sub_map.id, owner.id),
        mod_membership: mod_membership,
        member_membership: SubMaps.get_membership(sub_map.id, member.id)
      }
    end

    test "allows sub-map owner to delete another user's comment", %{
      owner: owner,
      commenter: commenter,
      sub_map: sub_map,
      pin: pin,
      owner_membership: owner_membership
    } do
      comment = insert_comment!(pin, commenter)

      assert :ok =
               CommentAuthorizer.authorize_delete(owner, pin, comment,
                 sub_map: sub_map,
                 membership: owner_membership
               )
    end

    test "allows garden moderator to delete another user's comment", %{
      moderator: moderator,
      commenter: commenter,
      sub_map: sub_map,
      pin: pin,
      mod_membership: mod_membership
    } do
      comment = insert_comment!(pin, commenter)

      assert :ok =
               CommentAuthorizer.authorize_delete(moderator, pin, comment,
                 sub_map: sub_map,
                 membership: mod_membership
               )
    end

    test "forbids a regular garden member", %{
      member: member,
      commenter: commenter,
      sub_map: sub_map,
      pin: pin,
      member_membership: member_membership
    } do
      comment = insert_comment!(pin, commenter)

      assert {:error, :forbidden} =
               CommentAuthorizer.authorize_delete(member, pin, comment,
                 sub_map: sub_map,
                 membership: member_membership
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
