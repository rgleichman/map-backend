defmodule Storymap.PinTypes.PolicyTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinTypesFixtures

  alias Storymap.Accounts.User
  alias Storymap.PinTypes.{CustomPinType, Policy}
  alias Storymap.Repo

  describe "can_create?/1" do
    test "allows unmuted users" do
      assert Policy.can_create?(user_fixture())
    end

    test "returns false for nil and non-user values" do
      refute Policy.can_create?(nil)
      refute Policy.can_create?(%{})
    end

    test "returns false for muted users" do
      refute Policy.can_create?(muted_user_fixture())
    end
  end

  describe "can_edit?/2" do
    test "allows owner to edit their pin type" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      assert Policy.can_edit?(user, pin_type)
    end

    test "allows site moderator to edit another user's pin type" do
      owner = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, owner)
      moderator = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 1)))
      assert Policy.can_edit?(moderator, pin_type)
    end

    test "returns false for muted owner" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      muted = muted_user_fixture(user)
      refute Policy.can_edit?(muted, pin_type)
    end

    test "returns false for muted moderator" do
      owner = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, owner)

      moderator =
        user_fixture()
        |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 1)))
        |> muted_user_fixture()

      refute Policy.can_edit?(moderator, pin_type)
    end

    test "returns false for catch-all arguments" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)

      refute Policy.can_edit?(nil, pin_type)
      refute Policy.can_edit?(user, %CustomPinType{})
      refute Policy.can_edit?(%User{}, %{})
    end
  end

  describe "can_delete?/2" do
    test "mirrors can_edit?/2 for valid arguments" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      assert Policy.can_delete?(user, pin_type)
    end

    test "returns false for muted owner" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)
      muted = muted_user_fixture(user)
      refute Policy.can_delete?(muted, pin_type)
    end

    test "returns false for catch-all arguments" do
      user = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, user)

      refute Policy.can_delete?(nil, pin_type)
      refute Policy.can_delete?(user, %CustomPinType{})
      refute Policy.can_delete?(%User{}, %{})
    end
  end
end
