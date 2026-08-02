defmodule Storymap.Repo.Migrations.AddColorToSubMaps do
  use Ecto.Migration

  def change do
    alter table(:sub_maps) do
      add :color, :string, null: false, default: "#6366f1"
    end
  end
end
