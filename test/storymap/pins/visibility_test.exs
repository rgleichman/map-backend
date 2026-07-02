defmodule Storymap.Pins.VisibilityTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Pins.Pin
  alias Storymap.Pins.Visibility
  alias Storymap.Repo

  describe "world_visible?/1" do
    test "true for approved world pin" do
      pin = pin_fixture()
      assert Visibility.world_visible?(pin)
    end

    test "false for pending world pin" do
      owner = user_fixture()
      pin = pin_fixture(%{}, owner)
      pin = Repo.update!(Ecto.Changeset.change(pin, %{status: :pending}))
      refute Visibility.world_visible?(pin)
    end

    test "true for approved sub-map pin promoted to world" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "always", "community_url" => "vis-world"},
          owner
        )

      pin =
        %Pin{
          status: :approved,
          sub_map_id: sub_map.id,
          visible_on_world_map: true,
          title: "Promoted",
          latitude: 30.0,
          longitude: -97.0,
          pin_type: "other",
          user_id: owner.id
        }
        |> Repo.insert!()

      assert Visibility.world_visible?(pin)
    end

    test "false for approved sub-map-only pin" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "never", "community_url" => "vis-local"},
          owner
        )

      pin =
        %Pin{
          status: :approved,
          sub_map_id: sub_map.id,
          visible_on_world_map: false,
          title: "Local",
          latitude: 30.0,
          longitude: -97.0,
          pin_type: "other",
          user_id: owner.id
        }
        |> Repo.insert!()

      refute Visibility.world_visible?(pin)
    end
  end

  describe "resolve_visible_on_world_map/5" do
    setup do
      owner = user_fixture()
      member = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "ask", "community_url" => "vis-resolve"},
          owner
        )

      %{sub_map: sub_map, owner: owner, member: member}
    end

    test "returns requested when actor may set flag", %{sub_map: sub_map, owner: owner} do
      membership = %{role: :owner, status: :active}

      assert Visibility.resolve_visible_on_world_map(sub_map, owner, membership, true, false)
      refute Visibility.resolve_visible_on_world_map(sub_map, owner, membership, false, true)
    end

    test "returns fallback when actor may not set flag", %{sub_map: sub_map} do
      other = user_fixture()
      sub_map = %{sub_map | promote_to_world_default: :always}

      refute Visibility.resolve_visible_on_world_map(sub_map, other, membership(), true, false)
      assert Visibility.resolve_visible_on_world_map(sub_map, other, membership(), false, true)
    end

    test "returns fallback when requested is nil", %{sub_map: sub_map} do
      other = user_fixture()
      sub_map = %{sub_map | promote_to_world_default: :always}

      refute Visibility.resolve_visible_on_world_map(sub_map, other, membership(), nil, false)
    end
  end

  defp membership(role \\ :member) do
    %{role: role, status: :active}
  end

  describe "sanitize_attrs_visible_on_world_map/5" do
    test "keeps existing value when actor cannot change flag" do
      owner = user_fixture()
      other = user_fixture()

      sub_map =
        sub_map_fixture(
          %{
            "promote_to_world_default" => "always",
            "contribution_mode" => "open",
            "community_url" => "vis-sanitize"
          },
          owner
        )

      pin =
        %Pin{
          status: :approved,
          sub_map_id: sub_map.id,
          visible_on_world_map: false,
          title: "Local",
          latitude: 30.0,
          longitude: -97.0,
          pin_type: "other",
          user_id: owner.id
        }
        |> Repo.insert!()

      attrs =
        Visibility.sanitize_attrs_visible_on_world_map(
          %{"visible_on_world_map" => true},
          sub_map,
          pin,
          other,
          membership()
        )

      refute attrs["visible_on_world_map"]
    end
  end

  describe "initial_visible_on_world_map/4" do
    test "uses promotion default when requested is absent" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "never", "community_url" => "vis-initial"},
          owner
        )

      refute Visibility.initial_visible_on_world_map(%{}, sub_map, owner, nil)
    end
  end
end
