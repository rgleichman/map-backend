defmodule Storymap.Pins.PinDiff do
  @moduledoc """
  Computes a JSON-safe diff between two `Storymap.Pins.Pin` structs.

  Intended for admin activity metadata (no `user_id`, no PII).
  """

  alias Storymap.Pins.Pin

  @diff_fields [
    :title,
    :latitude,
    :longitude,
    :pin_type,
    :description,
    :icon_url,
    :start_time,
    :end_time,
    :schedule_rrule,
    :schedule_timezone
  ]

  @spec diff(Pin.t(), Pin.t()) :: map()
  def diff(%Pin{} = before, %Pin{} = after_pin) do
    field_changes =
      Enum.reduce(@diff_fields, %{}, fn field, acc ->
        from_val = normalize(Map.get(before, field))
        to_val = normalize(Map.get(after_pin, field))

        if from_val == to_val do
          acc
        else
          Map.put(acc, Atom.to_string(field), %{"from" => from_val, "to" => to_val})
        end
      end)

    tags_from = normalize_tags(before)
    tags_to = normalize_tags(after_pin)

    field_changes =
      cond do
        tags_from == :tags_not_loaded or tags_to == :tags_not_loaded ->
          field_changes

        tags_from == tags_to ->
          field_changes

        true ->
          Map.put(field_changes, "tags", %{"from" => tags_from, "to" => tags_to})
      end

    %{"changes" => field_changes}
  end

  defp normalize(nil), do: nil
  defp normalize(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp normalize(val) when is_float(val), do: val
  defp normalize(val) when is_integer(val), do: val
  defp normalize(val) when is_binary(val), do: val
  defp normalize(val) when is_boolean(val), do: val

  defp normalize(val) do
    inspect(val)
  end

  defp normalize_tags(%Pin{tags: %Ecto.Association.NotLoaded{}}), do: :tags_not_loaded

  defp normalize_tags(%Pin{tags: tags}) when is_list(tags) do
    tags
    |> Enum.map(& &1.name)
    |> Enum.sort()
  end

  defp normalize_tags(_pin), do: []
end
