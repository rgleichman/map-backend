defmodule Storymap.SubMaps.PolicyTest do
  use ExUnit.Case, async: true

  alias Storymap.Accounts.User
  alias Storymap.SubMaps.{Membership, Policy, SubMap}

  defp sub_map(attrs) do
    struct(
      SubMap,
      Map.merge(%{promote_to_world_default: :ask, contribution_mode: :open}, attrs)
    )
  end

  defp user(admin_level \\ 0), do: %User{id: 1, admin_level: admin_level}

  defp membership(role \\ :member) do
    %Membership{role: role, status: :active}
  end

  describe "can_view?/3" do
    test "allows public and unlisted visibility" do
      assert Policy.can_view?(sub_map(%{visibility: :public}), user(), membership())
      assert Policy.can_view?(sub_map(%{visibility: :unlisted}), user(), membership())
    end

    test "forbids private visibility" do
      sm = sub_map(%{visibility: :private})
      refute Policy.can_view?(sm, user(), membership())
      refute Policy.can_view?(sm, user(), membership(:owner))
      refute Policy.can_view?(sm, nil, nil)
    end
  end

  describe "can_post?/3" do
    test "forbids banned membership in members_only community" do
      sm = sub_map(%{contribution_mode: :members_only})
      banned = %Membership{role: :member, status: :banned}
      refute Policy.can_post?(user(), sm, banned)
    end

    test "allows site admin to post in members_only without membership" do
      sm = sub_map(%{contribution_mode: :members_only})
      assert Policy.can_post?(user(1), sm, nil)
    end
  end

  describe "can_moderate?/3" do
    test "returns false for regular member without admin level" do
      sm = sub_map(%{})
      refute Policy.can_moderate?(user(), sm, membership())
    end
  end

  describe "promotion_default_visible?/1" do
    test "never promotion default is not visible" do
      refute Policy.promotion_default_visible?(sub_map(%{promote_to_world_default: :never}))
    end
  end

  describe "can_set_visible_on_world?/3" do
    test "never forbids everyone" do
      sm = sub_map(%{promote_to_world_default: :never, contribution_mode: :open})
      refute Policy.can_set_visible_on_world?(sm, user(), membership())
      refute Policy.can_set_visible_on_world?(sm, user(1), membership(:owner))
    end

    test "ask allows logged-in posters in open communities" do
      sm = sub_map(%{promote_to_world_default: :ask, contribution_mode: :open})
      refute Policy.can_set_visible_on_world?(sm, nil, nil)
      assert Policy.can_set_visible_on_world?(sm, user(), nil)
      assert Policy.can_set_visible_on_world?(sm, user(), membership(:moderator))
    end

    test "ask members_only requires membership to opt in" do
      sm = sub_map(%{promote_to_world_default: :ask, contribution_mode: :members_only})
      refute Policy.can_set_visible_on_world?(sm, user(), nil)
      assert Policy.can_set_visible_on_world?(sm, user(), membership())
    end

    test "always allows only mods to override default" do
      sm = sub_map(%{promote_to_world_default: :always, contribution_mode: :open})
      refute Policy.can_set_visible_on_world?(sm, user(), membership())
      assert Policy.can_set_visible_on_world?(sm, user(), membership(:owner))
      assert Policy.can_set_visible_on_world?(sm, user(), membership(:moderator))
    end
  end
end
