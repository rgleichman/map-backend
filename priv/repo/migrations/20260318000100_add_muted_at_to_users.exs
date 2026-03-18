defmodule Storymap.Repo.Migrations.AddMutedAtToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :muted_at, :utc_datetime
    end
  end
end
