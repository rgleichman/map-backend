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
