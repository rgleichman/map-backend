defmodule Storymap.Pins.CommentAuthorizerTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins.CommentAuthorizer
  alias Storymap.Repo
  alias Storymap.SubMaps

  describe "authorize_create/3" do
    test "allows logged-in user on visible pin" do
      pin = pin_fixture()
      user = user_fixture()
      assert :ok = CommentAuthorizer.authorize_create(user, pin, [])
    end

    test "forbids muted user" do
      pin = pin_fixture()
      muted = muted_user_fixture()
      assert {:error, :forbidden} = CommentAuthorizer.authorize_create(muted, pin, [])
    end
  end

  describe "authorize_update/2" do
    test "allows comment author" do
      user = user_fixture()
      comment = pin_comment_fixture(%{}, nil, user)
      assert :ok = CommentAuthorizer.authorize_update(user, comment, [])
    end

    test "forbids non-author" do
      author = user_fixture()
      other = user_fixture()
      comment = pin_comment_fixture(%{}, nil, author)
      assert {:error, :forbidden} = CommentAuthorizer.authorize_update(other, comment, [])
    end
  end

  describe "authorize_delete/4" do
    test "allows comment author" do
      pin = pin_fixture()
      user = user_fixture()
      comment = pin_comment_fixture(%{}, pin, user)
      assert :ok = CommentAuthorizer.authorize_delete(user, pin, comment, [])
    end

    test "allows site pin moderator" do
      pin = pin_fixture()
      author = user_fixture()
      admin = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 1)))
      comment = pin_comment_fixture(%{}, pin, author)
      assert :ok = CommentAuthorizer.authorize_delete(admin, pin, comment, [])
    end

    test "allows sub-map owner to delete another user's comment" do
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
      comment = pin_comment_fixture(%{}, pin, commenter)

      assert :ok =
               CommentAuthorizer.authorize_delete(owner, pin, comment,
                 sub_map: sub_map,
                 membership: membership
               )
    end
  end
end
