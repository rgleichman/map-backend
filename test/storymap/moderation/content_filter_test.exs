defmodule Storymap.Moderation.ContentFilterTest do
  use ExUnit.Case, async: true

  alias Storymap.Moderation.ContentFilter
  alias Storymap.Pins.Pin

  describe "flagged?/1" do
    test "flags configured fixture phrase case-insensitively" do
      assert ContentFilter.flagged?("this has ZZHATEPHRASE in it")
    end

    test "flags phrase amid punctuation" do
      assert ContentFilter.flagged?("...zzhatephrase!!!")
    end

    test "does not flag clean text" do
      refute ContentFilter.flagged?("A lovely garden spot")
    end

    test "does not flag nil or blank" do
      refute ContentFilter.flagged?(nil)
      refute ContentFilter.flagged?("")
      refute ContentFilter.flagged?("   ")
    end

    test "does not match phrase as substring of a longer token" do
      refute ContentFilter.flagged?("zzhatephrasesextra")
    end
  end

  describe "extract_pin_texts/1" do
    test "extracts title, description, custom_data, ad_hoc, and tags from attrs" do
      texts =
        ContentFilter.extract_pin_texts(%{
          "title" => "Hello",
          "description" => "World",
          "custom_data" => %{"note" => "custom text", "music" => %{"ref" => 1}},
          "ad_hoc_fields" => [
            %{
              "label" => "Extra",
              "options" => [%{"label" => "Opt", "value" => "opt"}],
              "value" => "adhoc value"
            }
          ],
          "tags" => ["green", %{"name" => "local"}]
        })

      assert "Hello" in texts
      assert "World" in texts
      assert "custom text" in texts
      assert "Extra" in texts
      assert "Opt" in texts
      assert "opt" in texts
      assert "adhoc value" in texts
      assert "green" in texts
      assert "local" in texts
      refute Enum.any?(texts, &(&1 == %{"ref" => 1}))
    end

    test "extracts from pin struct" do
      pin = %Pin{
        title: "T",
        description: "D",
        custom_data: %{"a" => "x"},
        ad_hoc_fields: [],
        tags: []
      }

      assert ContentFilter.extract_pin_texts(pin) == ["T", "D", "x"]
    end
  end

  describe "flagged_texts?/1" do
    test "true when any text is flagged" do
      assert ContentFilter.flagged_texts?(["ok", "contains zzhatephrase here"])
      refute ContentFilter.flagged_texts?(["ok", "fine"])
    end
  end
end
