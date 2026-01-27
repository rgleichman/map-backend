defmodule Storymap.Repo.Migrations.AddStartEndTimesAndAddresses do
  use Ecto.Migration

  def change do
    alter table(:pins) do
      add :start_time, :utc_datetime
      add :end_time, :utc_datetime
      add :pin_type, :string
    end
  end
end
