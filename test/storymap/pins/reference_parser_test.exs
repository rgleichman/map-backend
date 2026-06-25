defmodule Storymap.Pins.ReferenceParserTest do
  use ExUnit.Case, async: true

  alias Storymap.Pins.ReferenceParser

  @origin "https://mapgarden.net"

  describe "parse_map_pin_link/2" do
    test "parses world map pin URLs" do
      assert ReferenceParser.parse_map_pin_link("https://mapgarden.net/map?pin=89", @origin) ==
               {:ok, 89}

      assert ReferenceParser.parse_map_pin_link("https://mapgarden.net/?pin=42", @origin) ==
               {:ok, 42}
    end

    test "parses community map pin URLs" do
      assert ReferenceParser.parse_map_pin_link(
               "https://mapgarden.net/m/my-community/map?pin=12",
               @origin
             ) == {:ok, 12}
    end

    test "returns :error for foreign origins" do
      assert ReferenceParser.parse_map_pin_link("https://evil.com/map?pin=89", @origin) == :error
    end

    test "returns :error for non-map paths" do
      assert ReferenceParser.parse_map_pin_link("https://mapgarden.net/pins?pin=89", @origin) ==
               :error
    end

    test "returns :error when pin param is missing or invalid" do
      assert ReferenceParser.parse_map_pin_link("https://mapgarden.net/map", @origin) == :error

      assert ReferenceParser.parse_map_pin_link("https://mapgarden.net/map?pin=abc", @origin) ==
               :error
    end
  end

  describe "extract_pin_ids_from_text/2" do
    test "extracts pin ids from description text and bare URLs" do
      text = "See also https://mapgarden.net/map?pin=89 and /map?pin=42"

      assert ReferenceParser.extract_pin_ids_from_text(text, @origin) == [89, 42]
    end

    test "dedupes repeated targets" do
      text = "https://mapgarden.net/map?pin=5 and https://mapgarden.net/map?pin=5"

      assert ReferenceParser.extract_pin_ids_from_text(text, @origin) == [5]
    end

    test "ignores foreign URLs" do
      text = "https://evil.com/map?pin=89"

      assert ReferenceParser.extract_pin_ids_from_text(text, @origin) == []
    end
  end
end
