# Script for populating the database.
import Storymap.Accounts.Scope
import Storymap.{Accounts, Repo, SubMaps}

if Repo.aggregate(SubMaps.SubMap, :count) == 0 do
  case Accounts.get_user_by_email("owner@example.com") do
    nil ->
      {:ok, user} =
        Accounts.register_user(%{
          email: "owner@example.com"
        })

      {:ok, _sub_map} =
        SubMaps.create_sub_map(%Scope{user: user}, %{
          "name" => "BBQ Restaurants (Austin)",
          "community_url" => "bbq-austin",
          "description" => "A demo community for BBQ spots around Austin.",
          "contribution_mode" => "open",
          "promote_to_world_default" => "ask",
          "visibility" => "public"
        })

    _user ->
      :ok
  end
end
