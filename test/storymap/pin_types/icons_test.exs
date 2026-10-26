defmodule Storymap.PinTypes.IconsTest do
  use ExUnit.Case, async: true

  alias Storymap.PinTypes.Icons

  test "includes plant glyphs traced from the artist sheet" do
    assert Icons.valid?("grapes")
    assert Icons.valid?("fiddlehead")
    assert Icons.get("grapes")["style"] == "fill"

    layers = Enum.map(Icons.get("grapes")["layers"], & &1["name"])
    assert "ink" in layers
    assert "light" in layers
  end

  test "rejects unknown names" do
    refute Icons.valid?("not-a-glyph")
    refute Icons.valid?(nil)
  end

  test "layer_opacity keeps light inks visible when recolored" do
    assert Icons.layer_opacity(0) == 1.0
    assert Icons.layer_opacity(107) == 0.72
    assert Icons.layer_opacity(165) == 0.48
    assert Icons.layer_opacity(215) == 0.28
  end
end
