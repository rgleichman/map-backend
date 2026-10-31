defmodule Storymap.Repo.Migrations.AddIconBackgroundColorToPinTypes do
  use Ecto.Migration

  def change do
    alter table(:pin_types) do
      add :icon_background_color, :string
    end
  end
end
