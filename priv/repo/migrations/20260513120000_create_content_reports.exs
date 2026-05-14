defmodule Storymap.Repo.Migrations.CreateContentReports do
  use Ecto.Migration

  def change do
    create table(:content_reports) do
      add :subject_type, :string, null: false
      add :subject_id, :bigint, null: false
      add :subject_label, :string
      add :category, :string, null: false
      add :details, :text
      add :reporter_user_id, references(:users, on_delete: :nilify_all)
      add :resolved_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:content_reports, [:subject_type, :subject_id])
    create index(:content_reports, [:inserted_at])

    create index(:content_reports, [:inserted_at],
             where: "resolved_at IS NULL",
             name: :content_reports_unresolved_inserted_at
           )
  end
end
