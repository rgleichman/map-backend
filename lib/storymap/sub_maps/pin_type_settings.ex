defmodule Storymap.SubMaps.PinTypeSettings do
  @moduledoc false

  alias Storymap.PinTypes.CustomPinType

  @default_builtin CustomPinType.builtin_pin_types()

  def normalize_settings(settings) when is_map(settings) do
    settings
    |> migrate_allowed_pin_types()
    |> Map.put_new("enabled_builtin_pin_types", @default_builtin)
    |> Map.put_new("enabled_custom_pin_types", [])
  end

  def normalize_settings(_), do: normalize_settings(%{})

  def enabled_builtin_types(settings) do
    settings
    |> normalize_settings()
    |> Map.get("enabled_builtin_pin_types", @default_builtin)
    |> List.wrap()
  end

  def enabled_custom_slugs(settings) do
    settings
    |> normalize_settings()
    |> Map.get("enabled_custom_pin_types", [])
    |> List.wrap()
  end

  def pin_type_allowed?(settings, pin_type) when is_binary(pin_type) do
    cond do
      pin_type in @default_builtin ->
        pin_type in enabled_builtin_types(settings)

      CustomPinType.custom_pin_type?(pin_type) ->
        slug = CustomPinType.slug_from_pin_type(pin_type)
        slug in enabled_custom_slugs(settings)

      true ->
        false
    end
  end

  def merge_pin_type_settings(existing_settings, attrs) when is_map(attrs) do
    existing = normalize_settings(existing_settings)

    existing
    |> maybe_put_list("enabled_builtin_pin_types", attrs)
    |> maybe_put_list("enabled_custom_pin_types", attrs)
  end

  defp migrate_allowed_pin_types(%{"allowed_pin_types" => types} = settings)
       when is_list(types) and types != [] do
    settings
    |> Map.put("enabled_builtin_pin_types", types)
    |> Map.delete("allowed_pin_types")
  end

  defp migrate_allowed_pin_types(%{allowed_pin_types: types} = settings)
       when is_list(types) and types != [] do
    settings
    |> Map.put("enabled_builtin_pin_types", types)
    |> Map.delete(:allowed_pin_types)
  end

  defp migrate_allowed_pin_types(settings), do: settings

  defp maybe_put_list(settings, key, attrs) do
    case Map.get(attrs, key) || Map.get(attrs, String.to_atom(key)) do
      nil -> settings
      list when is_list(list) -> Map.put(settings, key, list)
      _ -> settings
    end
  end
end
