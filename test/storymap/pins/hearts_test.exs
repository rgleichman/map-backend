defmodule Storymap.Pins.HeartsTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.Pins.{Hearts, PinHeart}

  describe "heart/2 and unheart/2" do
    test "heart is idempotent" do
      user = user_fixture()
      pin = pin_fixture(%{}, user)

      assert {:ok, _} = Hearts.heart(user, pin)
      assert {:ok, _} = Hearts.heart(user, pin)
      assert Hearts.hearted?(user, pin)
    end

    test "unheart removes the heart" do
      user = user_fixture()
      pin = pin_fixture(%{}, user)

      pin_heart_fixture(user, pin)
      assert :ok = Hearts.unheart(user, pin)
      refute Hearts.hearted?(user, pin)
    end

    test "unheart is idempotent" do
      user = user_fixture()
      pin = pin_fixture(%{}, user)
      assert :ok = Hearts.unheart(user, pin)
    end

    test "changeset ignores user_id in attrs" do
      user = user_fixture()
      other = user_fixture()
      pin = pin_fixture(%{}, user)

      assert {:ok, heart} = Hearts.heart(user, pin)
      assert heart.user_id == user.id

      refute PinHeart.changeset(%PinHeart{}, %{pin_id: pin.id, user_id: other.id}).changes[
               :user_id
             ]
    end
  end

  describe "list_pins/2" do
    test "returns hearted pins" do
      user = user_fixture()
      pin1 = pin_fixture(%{"title" => "First"}, user)
      pin2 = pin_fixture(%{"title" => "Second"}, user)

      pin_heart_fixture(user, pin1)
      pin_heart_fixture(user, pin2)

      titles = user |> Hearts.list_pins() |> Enum.map(& &1.title)
      assert MapSet.new(titles) == MapSet.new(["First", "Second"])
    end

    test "respects limit option" do
      user = user_fixture()
      pin1 = pin_fixture(%{}, user)
      pin2 = pin_fixture(%{}, user)

      pin_heart_fixture(user, pin1)
      pin_heart_fixture(user, pin2)

      assert length(Hearts.list_pins(user, limit: 1)) == 1
    end

    test "excludes pins the viewer can no longer see" do
      import Storymap.SubMapsFixtures

      user = user_fixture()
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
      pin_heart_fixture(user, pin)

      assert Hearts.list_pins(user) == []
      assert Hearts.list_pin_ids(user) == []
    end
  end
end
