defmodule Storymap.SubMaps.CommunityTagTest do
  use ExUnit.Case, async: true

  alias Storymap.SubMaps.CommunityTag

  test "name/1 builds reserved tag" do
    assert CommunityTag.name("bbq-austin") == "community:bbq-austin"
    assert CommunityTag.name(%{community_url: "bbq-austin"}) == "community:bbq-austin"
  end

  test "community_url_from_tag/1 parses reserved tags" do
    assert CommunityTag.community_url_from_tag("community:bbq-austin") == {:ok, "bbq-austin"}
    assert CommunityTag.community_url_from_tag("bbq") == :error
  end

  test "merge/2 adds community tag without duplicates" do
    sub_map = %{community_url: "demo"}
    assert CommunityTag.merge(["bbq"], sub_map) == ["community:demo", "bbq"]
    assert CommunityTag.merge(["community:demo", "bbq"], sub_map) == ["community:demo", "bbq"]
  end
end
