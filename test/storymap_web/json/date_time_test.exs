defmodule StorymapWeb.JSON.DateTimeTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.JSON.DateTime, as: JSONDateTime

  test "to_iso8601 emits a UTC instant with Z, truncated to seconds" do
    dt = ~U[2026-10-28 18:00:00.123456Z]
    assert JSONDateTime.to_iso8601(dt) == "2026-10-28T18:00:00Z"
  end

  test "to_iso_local omits Z so the wire format signals wall-clock" do
    dt = ~U[2026-10-28 18:00:00Z]
    assert JSONDateTime.to_iso_local(dt) == "2026-10-28T18:00:00"
  end

  test "both helpers return nil for non-datetime values" do
    assert JSONDateTime.to_iso8601(nil) == nil
    assert JSONDateTime.to_iso_local(nil) == nil
  end
end
