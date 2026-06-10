defmodule Storymap.SubMaps.CommunityUrlTest do
  use ExUnit.Case, async: true
  alias Storymap.SubMaps.CommunityUrl

  test "validates normalized url" do
    assert {:ok, "bbq-austin"} = CommunityUrl.validate("BBQ-Austin")
  end

  test "rejects reserved words" do
    assert {:error, :reserved} = CommunityUrl.validate("new")
  end

  test "rejects invalid format" do
    assert {:error, :invalid_format} = CommunityUrl.validate("bad_url")
  end
end
