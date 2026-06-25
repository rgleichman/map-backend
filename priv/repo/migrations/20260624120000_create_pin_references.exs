defmodule Storymap.Repo.Migrations.CreatePinReferences do
  use Ecto.Migration

  def change do
    create table(:pin_references) do
      add :source_pin_id, references(:pins, on_delete: :delete_all), null: false
      add :target_pin_id, references(:pins, on_delete: :delete_all), null: false
      add :kind, :string, null: false
      add :source_field, :string
      add :position, :integer

      timestamps(type: :utc_datetime)
    end

    create unique_index(:pin_references, [:source_pin_id, :target_pin_id])
    create index(:pin_references, [:target_pin_id])
  end
end
