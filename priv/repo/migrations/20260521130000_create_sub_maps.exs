defmodule Storymap.Repo.Migrations.CreateSubMaps do
  use Ecto.Migration

  def up do
    create table(:sub_maps) do
      add :community_url, :string, null: false
      add :name, :string, null: false
      add :description, :text
      add :rules, :text
      add :owner_user_id, references(:users, on_delete: :restrict), null: false
      add :contribution_mode, :string, null: false, default: "open"
      add :promote_to_world_default, :string, null: false, default: "ask"
      add :visibility, :string, null: false, default: "public"
      add :bounds, :map
      add :settings, :map, null: false, default: %{}

      timestamps(type: :utc_datetime)
    end

    create unique_index(:sub_maps, [:community_url])

    create table(:sub_map_memberships) do
      add :sub_map_id, references(:sub_maps, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :role, :string, null: false, default: "member"
      add :status, :string, null: false, default: "active"

      timestamps(type: :utc_datetime)
    end

    create unique_index(:sub_map_memberships, [:sub_map_id, :user_id])

    alter table(:pins) do
      add :sub_map_id, references(:sub_maps, on_delete: :nilify_all)
      add :status, :string, null: false, default: "approved"
      add :visible_on_world_map, :boolean, null: false, default: true
    end

    create index(:pins, [:sub_map_id, :status])

    execute(
      """
      UPDATE pins SET visible_on_world_map = true, status = 'approved' WHERE sub_map_id IS NULL
      """,
      ""
    )

    alter table(:content_reports) do
      add :sub_map_id, references(:sub_maps, on_delete: :nilify_all)
    end

    alter table(:admin_activity_events) do
      add :sub_map_id, references(:sub_maps, on_delete: :nilify_all)
    end
  end

  def down do
    alter table(:admin_activity_events) do
      remove :sub_map_id
    end

    alter table(:content_reports) do
      remove :sub_map_id
    end

    drop index(:pins, [:sub_map_id, :status])

    alter table(:pins) do
      remove :visible_on_world_map
      remove :status
      remove :sub_map_id
    end

    drop table(:sub_map_memberships)
    drop table(:sub_maps)
  end
end
