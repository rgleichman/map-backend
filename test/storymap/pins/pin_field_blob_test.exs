defmodule Storymap.Pins.PinFieldBlobTest do
  use Storymap.DataCase, async: true

  alias Storymap.Pins.PinFieldBlob

  defp changeset(attrs) do
    PinFieldBlob.changeset(%PinFieldBlob{}, attrs)
  end

  defp base_attrs(payload) do
    %{
      pin_id: 1,
      field_key: "sketch",
      type: :drawing,
      format: "drawing/v1",
      version: 1,
      payload: payload
    }
  end

  test "accepts payloads up to 1 MiB" do
    payload = String.duplicate("a", 300_000)
    cs = changeset(base_attrs(payload))
    assert cs.valid?
  end

  test "rejects payloads over 1 MiB" do
    payload = String.duplicate("a", 1_048_577)
    cs = changeset(base_attrs(payload))
    refute cs.valid?
    assert "is too large (max 1048576 bytes)" in errors_on(cs).payload
  end
end
