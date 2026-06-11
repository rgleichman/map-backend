defmodule Storymap.Repo.Migrations.AddPerformanceIndexes do
  use Ecto.Migration

  def change do
    create index(:sub_maps, [:visibility, :inserted_at],
             where: "visibility = 'public'",
             name: :sub_maps_public_inserted_at_idx
           )

    create index(:pins, [:updated_at],
             where: "status = 'approved' AND (sub_map_id IS NULL OR visible_on_world_map = true)",
             name: :pins_world_map_updated_at_idx
           )

    create index(:sub_map_memberships, [:sub_map_id, :status],
             name: :sub_map_memberships_sub_map_id_status_idx
           )
  end
end
