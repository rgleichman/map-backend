defmodule StorymapWeb.PinFieldBlobJSON do
  @moduledoc false

  def show(%{blob: blob}) do
    %{data: blob_data(blob)}
  end

  defp blob_data(blob) do
    %{
      id: blob.id,
      pin_id: blob.pin_id,
      field_key: blob.field_key,
      type: blob.type,
      format: blob.format,
      version: blob.version,
      payload: blob.payload
    }
  end
end
