defmodule Storymap.Repo.Migrations.CreateTrustTables do
  use Ecto.Migration

  def change do
    create table(:trust_events) do
      add :type, :string, null: false
      add :actor_user_id, references(:users, on_delete: :delete_all), null: false
      add :subject_user_id, references(:users, on_delete: :delete_all), null: false
      add :pin_id, references(:pins, on_delete: :nilify_all)
      add :payload, :map, null: false, default: %{}

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:trust_events, [:type])
    create index(:trust_events, [:actor_user_id])
    create index(:trust_events, [:subject_user_id])
    create index(:trust_events, [:pin_id])

    create unique_index(:trust_events, [:actor_user_id, :pin_id],
             where: "type = 'pin_approve' AND pin_id IS NOT NULL",
             name: :trust_events_pin_approve_actor_pin_unique
           )

    create table(:trust_vouches) do
      add :actor_user_id, references(:users, on_delete: :delete_all), null: false
      add :subject_user_id, references(:users, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:trust_vouches, [:actor_user_id, :subject_user_id])
    create index(:trust_vouches, [:actor_user_id])

    create table(:user_trust_scores) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :t_social_raw, :float, null: false, default: 0.0
      add :t_social_cal, :float, null: false, default: 0.0
      add :t_id, :float, null: false, default: 0.0
      add :t_effective, :float, null: false, default: 0.0
      add :computed_at, :utc_datetime, null: false
      add :params_version, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_trust_scores, [:user_id])
  end
end
