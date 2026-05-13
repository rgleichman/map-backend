defmodule Storymap.Repo.Migrations.CreateAdminActivityEventsAndReads do
  use Ecto.Migration

  def change do
    create table(:admin_activity_events) do
      add :type, :string, null: false
      add :actor_user_id, references(:users, on_delete: :nilify_all), null: true
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime)
    end

    create index(:admin_activity_events, [:inserted_at])
    create index(:admin_activity_events, [:actor_user_id])

    create table(:admin_notification_reads) do
      add :admin_user_id, references(:users, on_delete: :delete_all), null: false

      add :admin_activity_event_id, references(:admin_activity_events, on_delete: :delete_all),
        null: false

      add :read_at, :utc_datetime, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:admin_notification_reads, [:admin_user_id, :admin_activity_event_id])
    create index(:admin_notification_reads, [:admin_user_id])
    create index(:admin_notification_reads, [:admin_activity_event_id])
    create index(:admin_notification_reads, [:read_at])
  end
end
