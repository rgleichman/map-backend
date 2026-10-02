defmodule Storymap.Pins.CommentsTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.Pins.Comments
  alias Storymap.Pins.PinComment

  describe "create_comment/3" do
    test "creates a top-level comment on an approved pin" do
      pin = pin_fixture()
      user = user_fixture()

      assert {:ok, %PinComment{} = comment} =
               Comments.create_comment(pin, user, %{"body" => "Nice spot"})

      assert comment.body == "Nice spot"
      assert comment.pin_id == pin.id
      assert comment.user_id == user.id
      assert comment.parent_id == nil
    end

    test "creates a reply to a top-level comment" do
      pin = pin_fixture()
      author = user_fixture()
      replier = user_fixture()
      parent = pin_comment_fixture(%{"body" => "Parent"}, pin, author)

      assert {:ok, %PinComment{} = reply} =
               Comments.create_comment(pin, replier, %{
                 "body" => "Reply here",
                 "parent_id" => parent.id
               })

      assert reply.parent_id == parent.id
      assert reply.body == "Reply here"
    end

    test "rejects reply to a reply" do
      pin = pin_fixture()
      user = user_fixture()
      parent = pin_comment_fixture(%{}, pin, user)

      {:ok, reply} =
        Comments.create_comment(pin, user, %{"body" => "first reply", "parent_id" => parent.id})

      assert {:error, %Ecto.Changeset{} = changeset} =
               Comments.create_comment(pin, user, %{
                 "body" => "nested",
                 "parent_id" => reply.id
               })

      assert "cannot reply to a reply" in errors_on(changeset).parent_id
    end

    test "rejects comments on non-approved pins" do
      pin = pin_fixture()
      pin = Storymap.Repo.update!(Ecto.Changeset.change(pin, %{status: :pending}))

      user = user_fixture()

      assert {:error, %Ecto.Changeset{} = changeset} =
               Comments.create_comment(pin, user, %{"body" => "Nope"})

      assert "comments are only allowed on approved pins" in errors_on(changeset).pin_id
    end

    test "holds flagged comments for moderation and creates a report" do
      pin = pin_fixture()
      user = user_fixture()

      assert {:ok, %PinComment{} = comment} =
               Comments.create_comment(pin, user, %{"body" => "has zzhatephrase in it"})

      assert PinComment.deleted?(comment)
      assert comment.held_for_moderation
      assert comment.body == "has zzhatephrase in it"

      assert [%{category: :abusive_or_hateful, subject_type: "pin_comment", subject_id: id}] =
               Storymap.Repo.all(Storymap.ContentReports.ContentReport)

      assert id == comment.id
    end
  end

  describe "update_comment/2" do
    test "holds flagged updates for moderation" do
      pin = pin_fixture()
      user = user_fixture()
      comment = pin_comment_fixture(%{"body" => "clean"}, pin, user)

      assert {:ok, %PinComment{} = held} =
               Comments.update_comment(comment, %{"body" => "now zzhatephrase"})

      assert PinComment.deleted?(held)
      assert held.held_for_moderation
    end
  end

  describe "delete_comment/1" do
    test "soft deletes a comment without held_for_moderation" do
      comment = pin_comment_fixture()

      assert {:ok, %PinComment{deleted_at: %DateTime{}, held_for_moderation: false}} =
               Comments.delete_comment(comment)

      assert PinComment.deleted?(Comments.get_comment!(comment.id))
    end
  end

  describe "list_for_pin/2" do
    test "returns top-level comments with replies preloaded" do
      pin = pin_fixture()
      user = user_fixture()
      parent = pin_comment_fixture(%{"body" => "Parent"}, pin, user)

      {:ok, _} =
        Comments.create_comment(pin, user, %{"body" => "Reply", "parent_id" => parent.id})

      [listed] = Comments.list_for_pin(pin.id)
      assert listed.id == parent.id
      assert length(listed.replies) == 1
      assert hd(listed.replies).body == "Reply"
    end
  end
end
