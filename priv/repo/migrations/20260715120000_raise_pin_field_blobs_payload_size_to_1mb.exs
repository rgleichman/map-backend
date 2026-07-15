defmodule Storymap.Repo.Migrations.RaisePinFieldBlobsPayloadSizeTo1mb do
  use Ecto.Migration

  @old_max_payload_bytes 262_144
  @new_max_payload_bytes 1_048_576

  def up do
    drop constraint(:pin_field_blobs, :pin_field_blobs_payload_size)

    create constraint(:pin_field_blobs, :pin_field_blobs_payload_size,
             check: "octet_length(payload) <= #{@new_max_payload_bytes}"
           )
  end

  def down do
    drop constraint(:pin_field_blobs, :pin_field_blobs_payload_size)

    create constraint(:pin_field_blobs, :pin_field_blobs_payload_size,
             check: "octet_length(payload) <= #{@old_max_payload_bytes}"
           )
  end
end
