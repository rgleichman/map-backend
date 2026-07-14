defmodule StorymapWeb.JSON.DateTime do
  @moduledoc """
  Serialize UTC datetimes as "YYYY-MM-DDTHH:mm:ss" (no Z) so the wire format signals "local".
  """

  @spec to_iso_local(DateTime.t() | nil) :: String.t() | nil
  def to_iso_local(%DateTime{} = dt) do
    pad = fn n -> String.pad_leading(Integer.to_string(n), 2, "0") end

    "#{dt.year}-#{pad.(dt.month)}-#{pad.(dt.day)}T#{pad.(dt.hour)}:#{pad.(dt.minute)}:#{pad.(dt.second)}"
  end

  def to_iso_local(_), do: nil
end
