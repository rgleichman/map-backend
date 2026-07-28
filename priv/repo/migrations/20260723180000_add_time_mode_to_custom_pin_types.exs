defmodule Storymap.Repo.Migrations.AddTimeModeToCustomPinTypes do
  use Ecto.Migration

  def change do
    alter table(:custom_pin_types) do
      add :time_mode, :string, null: false, default: "none"
    end
  end
end
