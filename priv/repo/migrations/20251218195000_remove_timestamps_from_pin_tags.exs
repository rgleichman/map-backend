defmodule Storymap.Repo.Migrations.RemoveTimestampsFromPinTags do
  use Ecto.Migration

  def change do
    alter table(:pin_tags) do
      remove :inserted_at
      remove :updated_at
    end
  end
end
