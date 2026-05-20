defmodule Storymap.AdminActivity.Event do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{
          id: integer() | nil,
          type: String.t(),
          actor_user_id: integer() | nil,
          metadata: map(),
          counts_toward_unread: boolean(),
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "admin_activity_events" do
    field :type, :string
    field :metadata, :map, default: %{}
    field :counts_toward_unread, :boolean, default: true

    belongs_to :actor_user, Storymap.Accounts.User

    timestamps(type: :utc_datetime)
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [:type, :metadata, :actor_user_id, :counts_toward_unread])
    |> validate_required([:type, :metadata, :counts_toward_unread])
  end
end
