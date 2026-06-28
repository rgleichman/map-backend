defmodule Storymap.Repo.Migrations.CascadeDeletePinCommentsOnUserDelete do
  use Ecto.Migration

  def up do
    drop constraint(:pin_comments, "pin_comments_user_id_fkey")

    alter table(:pin_comments) do
      modify :user_id, references(:users, on_delete: :delete_all)
    end
  end

  def down do
    drop constraint(:pin_comments, "pin_comments_user_id_fkey")

    alter table(:pin_comments) do
      modify :user_id, references(:users, on_delete: :nilify_all)
    end
  end
end
