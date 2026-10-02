defmodule Storymap.Repo.Migrations.AddHeldForModerationToPinComments do
  use Ecto.Migration

  def change do
    alter table(:pin_comments) do
      add :held_for_moderation, :boolean, null: false, default: false
    end
  end
end
