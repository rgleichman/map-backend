defmodule StorymapWeb.PinMusicFieldJSON do
  @moduledoc false

  alias Storymap.Pins.PinFieldBlob

  def show(%{blob: %PinFieldBlob{} = blob}) do
    %{
      data: %{
        id: blob.id,
        pin_id: blob.pin_id,
        field_key: blob.field_key,
        type: blob.type,
        format: blob.format,
        version: blob.version,
        payload: blob.payload
      }
    }
  end
end
