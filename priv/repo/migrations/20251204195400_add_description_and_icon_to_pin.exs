defmodule Storymap.Repo.Migrations.AddDescriptionAndIconToPin do
  use Ecto.Migration

  def change do
    alter table(:pins) do
      add :description, :text
      add :icon_url, :string
    end
  end
end
