defmodule Storymap.SubMaps.SubMap do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.SubMaps.{CommunityUrl, Membership}

  @contribution_modes ~w(open members_only approval_required)
  @promote_defaults ~w(never ask always)
  @visibilities ~w(public unlisted)

  schema "sub_maps" do
    field :community_url, :string
    field :name, :string
    field :description, :string
    field :rules, :string
    field :contribution_mode, :string, default: "open"
    field :promote_to_world_default, :string, default: "ask"
    field :visibility, :string, default: "public"
    field :bounds, :map
    field :settings, :map, default: %{}
    field :pin_count, :integer, virtual: true
    field :member_count, :integer, virtual: true
    field :pending_count, :integer, virtual: true

    belongs_to :owner, User, foreign_key: :owner_user_id
    has_many :memberships, Membership

    timestamps(type: :utc_datetime)
  end

  def contribution_modes, do: @contribution_modes
  def promote_defaults, do: @promote_defaults
  def visibilities, do: @visibilities

  def changeset(sub_map, attrs) do
    sub_map
    |> cast(attrs, [
      :community_url,
      :name,
      :description,
      :rules,
      :contribution_mode,
      :promote_to_world_default,
      :visibility,
      :bounds,
      :settings
    ])
    |> validate_required([:name, :contribution_mode, :promote_to_world_default, :visibility])
    |> validate_inclusion(:contribution_mode, @contribution_modes)
    |> validate_inclusion(:promote_to_world_default, @promote_defaults)
    |> validate_inclusion(:visibility, @visibilities)
    |> validate_length(:name, max: 120)
    |> validate_length(:description, max: 5000)
    |> validate_length(:rules, max: 10000)
    |> put_community_url()
    |> unique_constraint(:community_url)
    |> foreign_key_constraint(:owner_user_id)
  end

  defp put_community_url(changeset) do
    url =
      case get_change(changeset, :community_url) || get_field(changeset, :community_url) do
        nil ->
          CommunityUrl.generate_from_name(get_field(changeset, :name) || "")

        url ->
          CommunityUrl.normalize(url)
      end

    case CommunityUrl.validate(url || "") do
      {:ok, normalized} ->
        put_change(changeset, :community_url, normalized)

      {:error, reason} ->
        add_error(changeset, :community_url, CommunityUrl.error_message(reason))
    end
  end
end
