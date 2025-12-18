defmodule Storymap.Repo.Migrations.AddTagsAndPinTags do
  use Ecto.Migration

  def change do
    create table(:tags) do
      add :name, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:tags, [:name])

    create table(:pin_tags) do
      add :pin_id, references(:pins, on_delete: :delete_all), null: false
      add :tag_id, references(:tags, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:pin_tags, [:pin_id, :tag_id])
  end
end
