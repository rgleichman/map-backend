defmodule Storymap.Repo.Migrations.CreatePinComments do
  use Ecto.Migration

  def change do
    create table(:pin_comments) do
      add :pin_id, references(:pins, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :nilify_all)
      add :parent_id, references(:pin_comments, on_delete: :delete_all)
      add :body, :text, null: false
      add :deleted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:pin_comments, [:pin_id, :inserted_at])
    create index(:pin_comments, [:parent_id])
  end
end
