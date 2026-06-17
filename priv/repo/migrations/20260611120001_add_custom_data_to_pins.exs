defmodule Storymap.Repo.Migrations.AddCustomDataToPins do
  use Ecto.Migration

  def change do
    alter table(:pins) do
      add :custom_data, :map, null: false, default: %{}
    end
  end
end
