defmodule Storymap.TagsTest do
  use Storymap.DataCase, async: true

  alias Storymap.Repo
  alias Storymap.Tags
  alias Storymap.Tags.Tag

  describe "get_or_create_tag_by_name/1" do
    test "creates a tag with a lowercased name" do
      assert {:ok, %Tag{name: "bbq"}} = Tags.get_or_create_tag_by_name("BBQ")
      assert Repo.get_by(Tag, name: "bbq")
    end

    test "returns an existing tag without inserting a duplicate" do
      assert {:ok, first} = Tags.get_or_create_tag_by_name("tacos")
      assert {:ok, second} = Tags.get_or_create_tag_by_name("TACOS")
      assert first.id == second.id
      assert Repo.aggregate(Tag, :count) == 1
    end

    test "returns a changeset error for invalid names" do
      assert {:error, %Ecto.Changeset{}} = Tags.get_or_create_tag_by_name("")
    end
  end

  describe "get_or_create_tags_by_names/1" do
    test "creates missing tags and returns all in order" do
      assert {:ok, tags} = Tags.get_or_create_tags_by_names(["alpha", "beta"])
      assert Enum.map(tags, & &1.name) == ["alpha", "beta"]
    end

    test "reuses existing tags and creates only missing ones" do
      {:ok, existing} = Tags.get_or_create_tag_by_name("known")

      assert {:ok, tags} = Tags.get_or_create_tags_by_names(["KNOWN", "new"])
      assert Enum.map(tags, & &1.name) == ["known", "new"]
      assert Enum.at(tags, 0).id == existing.id
      assert Repo.aggregate(Tag, :count) == 2
    end

    test "deduplicates names before insert" do
      assert {:ok, tags} = Tags.get_or_create_tags_by_names(["dup", "DUP", "dup"])
      assert Enum.map(tags, & &1.name) == ["dup"]
      assert Repo.aggregate(Tag, :count) == 1
    end

    test "returns an empty list for an empty input" do
      assert {:ok, []} = Tags.get_or_create_tags_by_names([])
    end

    test "returns error when a name in the batch is invalid" do
      assert {:ok, _} = Tags.get_or_create_tags_by_names(["valid"])

      assert {:error, %Ecto.Changeset{}} =
               Tags.get_or_create_tags_by_names(["valid", ""])
    end
  end
end
