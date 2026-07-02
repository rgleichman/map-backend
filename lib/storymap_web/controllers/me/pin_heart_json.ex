defmodule StorymapWeb.Me.PinHeartJSON do
  @moduledoc false
  alias StorymapWeb.PinJSON

  @spec pins(map()) :: map()
  def pins(%{pins: pins, current_user: current_user}) do
    %{data: Enum.map(pins, &PinJSON.data_with_user(&1, current_user))}
  end
end
