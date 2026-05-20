defmodule Storymap.Repo.Migrations.AdminActivityReadsAndCountsTowardUnread do
  use Ecto.Migration

  def change do
    rename table(:admin_notification_reads), to: table(:admin_activity_reads)

    alter table(:admin_activity_events) do
      add :counts_toward_unread, :boolean, null: false, default: true
    end

    execute(
      "UPDATE admin_activity_events SET counts_toward_unread = false WHERE type = 'content_reported'",
      "UPDATE admin_activity_events SET counts_toward_unread = true WHERE type = 'content_reported'"
    )
  end
end
