defmodule Storymap.Repo.Migrations.CreatePinHearts do
  use Ecto.Migration

  def change do
    create table(:pin_hearts) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :pin_id, references(:pins, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:pin_hearts, [:user_id, :pin_id])
    create index(:pin_hearts, [:user_id, :inserted_at])
  end
end
