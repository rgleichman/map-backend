defmodule Storymap.Repo.Migrations.CascadeDeletePinsOnSubMapDelete do
  use Ecto.Migration

  def up do
    drop constraint(:pins, "pins_sub_map_id_fkey")

    alter table(:pins) do
      modify :sub_map_id, references(:sub_maps, on_delete: :delete_all)
    end
  end

  def down do
    drop constraint(:pins, "pins_sub_map_id_fkey")

    alter table(:pins) do
      modify :sub_map_id, references(:sub_maps, on_delete: :nilify_all)
    end
  end
end
