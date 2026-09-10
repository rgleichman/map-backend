defmodule Storymap.Trust.TrustEvent do
  @moduledoc """
  Append-only trust ledger row. See `docs/TRUST.md`.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin

  @types [:vouch, :vouch_revoke, :pin_approve]

  @type event_type :: :vouch | :vouch_revoke | :pin_approve

  @type t :: %__MODULE__{
          id: integer() | nil,
          type: event_type() | nil,
          actor_user_id: integer() | nil,
          subject_user_id: integer() | nil,
          pin_id: integer() | nil,
          payload: map(),
          inserted_at: DateTime.t() | nil
        }

  schema "trust_events" do
    field :type, Ecto.Enum, values: @types
    field :payload, :map, default: %{}

    belongs_to :actor, User, foreign_key: :actor_user_id
    belongs_to :subject, User, foreign_key: :subject_user_id
    belongs_to :pin, Pin

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec types() :: [event_type()]
  def types, do: @types

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(%__MODULE__{} = event, attrs) do
    event
    |> cast(attrs, [:type, :actor_user_id, :subject_user_id, :pin_id, :payload])
    |> validate_required([:type, :actor_user_id, :subject_user_id])
    |> validate_pin_approve_has_pin()
    |> foreign_key_constraint(:actor_user_id)
    |> foreign_key_constraint(:subject_user_id)
    |> foreign_key_constraint(:pin_id)
    |> unique_constraint([:actor_user_id, :pin_id],
      name: :trust_events_pin_approve_actor_pin_unique
    )
  end

  defp validate_pin_approve_has_pin(changeset) do
    if get_field(changeset, :type) == :pin_approve and is_nil(get_field(changeset, :pin_id)) do
      add_error(changeset, :pin_id, "is required for pin_approve")
    else
      changeset
    end
  end
end
