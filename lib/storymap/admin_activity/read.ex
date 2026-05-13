defmodule Storymap.AdminActivity.Read do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{
          id: integer() | nil,
          admin_user_id: integer(),
          admin_activity_event_id: integer(),
          read_at: DateTime.t(),
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "admin_notification_reads" do
    field :read_at, :utc_datetime

    belongs_to :admin_user, Storymap.Accounts.User
    belongs_to :event, Storymap.AdminActivity.Event, foreign_key: :admin_activity_event_id

    timestamps(type: :utc_datetime)
  end

  def changeset(read, attrs) do
    read
    |> cast(attrs, [:admin_user_id, :admin_activity_event_id, :read_at])
    |> validate_required([:admin_user_id, :admin_activity_event_id, :read_at])
    |> unique_constraint([:admin_user_id, :admin_activity_event_id])
  end
end
