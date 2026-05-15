defmodule Storymap.Pins.PolicyTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.Pins.Policy
  alias Storymap.Repo

  describe "authorize_create/1" do
    test "allows unmuted user" do
      user = user_fixture()
      assert :ok = Policy.authorize_create(user)
    end

    test "forbids muted user" do
      user = muted_user_fixture()
      assert {:error, :forbidden} = Policy.authorize_create(user)
    end
  end

  describe "authorize_update/2 and authorize_delete/2" do
    setup do
      owner = user_fixture()
      other = user_fixture()
      pin = pin_fixture(%{}, owner)
      %{owner: owner, other: other, pin: pin}
    end

    test "allows pin owner", %{owner: owner, pin: pin} do
      assert :ok = Policy.authorize_update(owner, pin)
      assert :ok = Policy.authorize_delete(owner, pin)
    end

    test "forbids non-owner without admin", %{other: other, pin: pin} do
      assert {:error, :forbidden} = Policy.authorize_update(other, pin)
      assert {:error, :forbidden} = Policy.authorize_delete(other, pin)
    end

    test "allows pin moderator admin", %{other: other, pin: pin} do
      admin = Repo.update!(Ecto.Changeset.change(other, admin_level: 1))
      assert :ok = Policy.authorize_update(admin, pin)
      assert :ok = Policy.authorize_delete(admin, pin)
    end

    test "forbids muted owner", %{owner: owner, pin: pin} do
      muted = muted_user_fixture(owner)
      assert {:error, :forbidden} = Policy.authorize_update(muted, pin)
    end
  end

  describe "owner_or_admin?/2" do
    test "true for owner and pin moderator admin" do
      owner = user_fixture()
      other = user_fixture()
      admin = Repo.update!(Ecto.Changeset.change(other, admin_level: 1))
      pin = pin_fixture(%{}, owner)

      assert Policy.owner_or_admin?(owner, pin)
      assert Policy.owner_or_admin?(admin, pin)
      refute Policy.owner_or_admin?(other, pin)
    end
  end

  describe "catalog_admin?/1" do
    test "true at admin level 10 and above" do
      user = Repo.update!(Ecto.Changeset.change(user_fixture(), admin_level: 10))
      assert Policy.catalog_admin?(user)
    end

    test "false below admin level 10" do
      refute Policy.catalog_admin?(user_fixture())
    end
  end

  defp muted_user_fixture(user \\ nil) do
    user = user || user_fixture()
    Repo.update!(Ecto.Changeset.change(user, muted_at: DateTime.utc_now(:second)))
  end
end
