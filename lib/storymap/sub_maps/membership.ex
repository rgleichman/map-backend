defmodule Storymap.SubMaps.Membership do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.SubMaps.SubMap

  @roles ~w(owner moderator member)
  @statuses ~w(active pending banned)

  schema "sub_map_memberships" do
    field :role, :string, default: "member"
    field :status, :string, default: "active"

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
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:sub_map_id, :user_id])
    |> foreign_key_constraint(:sub_map_id)
    |> foreign_key_constraint(:user_id)
  end
end
