defmodule Storymap.Repo.Migrations.AddAdminLevelToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :admin_level, :integer, null: false, default: 0
    end
  end
end
