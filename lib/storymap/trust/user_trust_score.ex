defmodule Storymap.Trust.UserTrustScore do
  @moduledoc """
  Materialized per-user trust scores. See `docs/TRUST.md`.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User

  @type t :: %__MODULE__{
          id: integer() | nil,
          user_id: integer() | nil,
          t_social_raw: float(),
          t_social_cal: float(),
          t_id: float(),
          t_effective: float(),
          computed_at: DateTime.t() | nil,
          params_version: String.t() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "user_trust_scores" do
    field :t_social_raw, :float, default: 0.0
    field :t_social_cal, :float, default: 0.0
    field :t_id, :float, default: 0.0
    field :t_effective, :float, default: 0.0
    field :computed_at, :utc_datetime
    field :params_version, :string

    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(%__MODULE__{} = score, attrs) do
    score
    |> cast(attrs, [
      :user_id,
      :t_social_raw,
      :t_social_cal,
      :t_id,
      :t_effective,
      :computed_at,
      :params_version
    ])
    |> validate_required([
      :user_id,
      :t_social_raw,
      :t_social_cal,
      :t_id,
      :t_effective,
      :computed_at,
      :params_version
    ])
    |> validate_number(:t_social_raw, greater_than_or_equal_to: 0.0)
    |> validate_number(:t_social_cal, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
    |> validate_number(:t_id, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
    |> validate_number(:t_effective, greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint(:user_id)
  end
end
