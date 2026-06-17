defmodule Storymap.Repo.Migrations.CreateCustomPinTypes do
  use Ecto.Migration

  def change do
    create table(:custom_pin_types) do
      add :slug, :string, null: false
      add :label, :string, null: false
      add :description, :text
      add :marker_color, :string
      add :icon, :string
      add :schema, :map, null: false, default: %{}
      add :enabled, :boolean, null: false, default: true
      add :created_by_user_id, references(:users, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:custom_pin_types, [:slug])
    create index(:custom_pin_types, [:enabled])
    create index(:custom_pin_types, [:created_by_user_id])
  end
end
