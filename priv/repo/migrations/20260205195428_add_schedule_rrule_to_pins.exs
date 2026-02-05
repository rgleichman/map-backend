defmodule Storymap.Repo.Migrations.AddScheduleRruleToPins do
  use Ecto.Migration

  def change do
    alter table(:pins) do
      add :schedule_rrule, :string
      add :schedule_timezone, :string
    end
  end
end
