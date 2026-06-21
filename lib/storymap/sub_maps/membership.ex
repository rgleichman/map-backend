defmodule Storymap.SubMaps.Membership do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.SubMaps.SubMap

  @roles [:owner, :moderator, :member]
  @statuses [:active, :pending, :banned]

  @type role :: :owner | :moderator | :member
  @type status :: :active | :pending | :banned

  @type t :: %__MODULE__{
          id: integer() | nil,
          role: role(),
          status: status(),
          sub_map_id: integer() | nil,
          user_id: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "sub_map_memberships" do
    field :role, Ecto.Enum, values: @roles, default: :member
    field :status, Ecto.Enum, values: @statuses, default: :active

    belongs_to :sub_map, SubMap
    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  def roles, do: @roles
  def statuses, do: @statuses

  def changeset(membership, attrs) do
    membership
    |> cast(attrs, [:role, :status, :sub_map_id, :user_id])
    |> validate_required([:role, :status, :sub_map_id, :user_id])
    |> unique_constraint([:sub_map_id, :user_id])
    |> foreign_key_constraint(:sub_map_id)
    |> foreign_key_constraint(:user_id)
  end
end
