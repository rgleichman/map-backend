defmodule Storymap.Repo.Migrations.CreatePinFieldBlobs do
  use Ecto.Migration

  @max_payload_bytes 262_144

  def change do
    create table(:pin_field_blobs) do
      add :pin_id, references(:pins, on_delete: :delete_all), null: false
      add :field_key, :string, null: false, size: 64
      add :type, :string, null: false, size: 32
      add :format, :string, null: false, size: 32, default: "music/v1"
      add :version, :integer, null: false, default: 1
      add :payload, :text, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:pin_field_blobs, [:pin_id])

    create unique_index(:pin_field_blobs, [:pin_id, :field_key, :type],
             name: :pin_field_blobs_pin_field_type_index
           )

    create constraint(:pin_field_blobs, :pin_field_blobs_payload_size,
             check: "octet_length(payload) <= #{@max_payload_bytes}"
           )
  end
end
