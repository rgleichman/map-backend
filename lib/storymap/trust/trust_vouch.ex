defmodule Storymap.Trust.TrustVouch do
  @moduledoc """
  Current-state active vouch projection. See `docs/TRUST.md`.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User

  @type t :: %__MODULE__{
          id: integer() | nil,
          actor_user_id: integer() | nil,
          subject_user_id: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "trust_vouches" do
    belongs_to :actor, User, foreign_key: :actor_user_id
    belongs_to :subject, User, foreign_key: :subject_user_id

    timestamps(type: :utc_datetime)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(%__MODULE__{} = vouch, attrs) do
    vouch
    |> cast(attrs, [:actor_user_id, :subject_user_id])
    |> validate_required([:actor_user_id, :subject_user_id])
    |> validate_not_self()
    |> foreign_key_constraint(:actor_user_id)
    |> foreign_key_constraint(:subject_user_id)
    |> unique_constraint([:actor_user_id, :subject_user_id])
  end

  defp validate_not_self(changeset) do
    actor = get_field(changeset, :actor_user_id)
    subject = get_field(changeset, :subject_user_id)

    if actor && subject && actor == subject do
      add_error(changeset, :subject_user_id, "cannot vouch for yourself")
    else
      changeset
    end
  end
end
