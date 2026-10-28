defmodule StorymapWeb.JSON.DateTime do
  @moduledoc """
  JSON datetime encoding.

  `to_iso_local/1` emits `"YYYY-MM-DDTHH:mm:ss"` (no `Z`) so the wire format
  signals wall-clock / local (pin schedule times).

  `to_iso8601/1` emits a UTC instant with `Z` (comment timestamps).
  """

  @spec to_iso_local(Elixir.DateTime.t() | nil) :: String.t() | nil
  def to_iso_local(%Elixir.DateTime{} = dt) do
    pad = fn n -> String.pad_leading(Integer.to_string(n), 2, "0") end

    "#{dt.year}-#{pad.(dt.month)}-#{pad.(dt.day)}T#{pad.(dt.hour)}:#{pad.(dt.minute)}:#{pad.(dt.second)}"
  end

  def to_iso_local(_), do: nil

  @spec to_iso8601(Elixir.DateTime.t() | nil) :: String.t() | nil
  def to_iso8601(%Elixir.DateTime{} = dt) do
    dt |> Elixir.DateTime.truncate(:second) |> Elixir.DateTime.to_iso8601()
  end

  def to_iso8601(_), do: nil
end
