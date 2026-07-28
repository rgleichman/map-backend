defmodule StorymapWeb.PinTypeJSON do
  @moduledoc false

  alias Storymap.PinTypes.PinType

  @spec index(map()) :: map()
  def index(%{pin_types: pin_types}) do
    %{data: Enum.map(pin_types, &data/1)}
  end

  @spec show(map()) :: map()
  def show(%{pin_type: pin_type}) do
    %{data: data(pin_type)}
  end

  @spec data(PinType.t()) :: map()
  def data(%PinType{} = pin_type) do
    %{
      id: pin_type.id,
      slug: pin_type.slug,
      label: pin_type.label,
      description: pin_type.description,
      marker_color: pin_type.marker_color,
      icon: pin_type.icon,
      schema: pin_type.schema || %{},
      time_mode: to_string(pin_type.time_mode),
      pin_type: pin_type.slug,
      is_system: pin_type.is_system,
      allow_open_24_7: pin_type.allow_open_24_7,
      enabled: pin_type.enabled,
      inserted_at: pin_type.inserted_at,
      updated_at: pin_type.updated_at
    }
  end
end
