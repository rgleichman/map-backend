defmodule StorymapWeb.PinTypeJSON do
  @moduledoc false

  alias Storymap.PinTypes.CustomPinType

  def index(%{pin_types: pin_types}) do
    %{data: Enum.map(pin_types, &data/1)}
  end

  def show(%{pin_type: pin_type}) do
    %{data: data(pin_type)}
  end

  def data(%CustomPinType{} = pin_type) do
    %{
      id: pin_type.id,
      slug: pin_type.slug,
      label: pin_type.label,
      description: pin_type.description,
      marker_color: pin_type.marker_color,
      icon: pin_type.icon,
      schema: pin_type.schema || %{},
      pin_type: CustomPinType.pin_type_value(pin_type),
      enabled: pin_type.enabled,
      created_by_user_id: pin_type.created_by_user_id,
      inserted_at: pin_type.inserted_at,
      updated_at: pin_type.updated_at
    }
  end
end
