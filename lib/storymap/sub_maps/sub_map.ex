defmodule Storymap.SubMaps.SubMap do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.SubMaps.{CommunityUrl, Membership}

  @contribution_modes [:open, :members_only, :approval_required]
  @promote_defaults [:never, :ask, :always]
  @visibilities [:public, :unlisted]

  @type contribution_mode :: :open | :members_only | :approval_required
  @type promote_to_world_default :: :never | :ask | :always
  @type visibility :: :public | :unlisted

  @type t :: %__MODULE__{
          id: integer() | nil,
          community_url: String.t() | nil,
          name: String.t() | nil,
          description: String.t() | nil,
          rules: String.t() | nil,
          contribution_mode: contribution_mode(),
          promote_to_world_default: promote_to_world_default(),
          visibility: visibility(),
          bounds: map() | nil,
          settings: map(),
          pin_count: integer() | nil,
          member_count: integer() | nil,
          pending_count: integer() | nil,
          owner_user_id: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "sub_maps" do
    field :community_url, :string
    field :name, :string
    field :description, :string
    field :rules, :string
    field :contribution_mode, Ecto.Enum, values: @contribution_modes, default: :open
    field :promote_to_world_default, Ecto.Enum, values: @promote_defaults, default: :ask
    field :visibility, Ecto.Enum, values: @visibilities, default: :public
    field :bounds, :map
    field :settings, :map, default: %{}
    field :pin_count, :integer, virtual: true
    field :member_count, :integer, virtual: true
    field :pending_count, :integer, virtual: true

    belongs_to :owner, User, foreign_key: :owner_user_id
    has_many :memberships, Membership

    timestamps(type: :utc_datetime)
  end

  @spec contribution_modes() :: [contribution_mode()]
  def contribution_modes, do: @contribution_modes

  @spec promote_defaults() :: [promote_to_world_default()]
  def promote_defaults, do: @promote_defaults

  @spec visibilities() :: [visibility()]
  def visibilities, do: @visibilities

  @spec contribution_mode_options() :: [{String.t(), contribution_mode()}]
  def contribution_mode_options do
    [
      {"Anyone logged in", :open},
      {"Members only", :members_only},
      {"Requires moderator approval", :approval_required}
    ]
  end

  @spec promote_default_options() :: [{String.t(), promote_to_world_default()}]
  def promote_default_options do
    [
      {"Never", :never},
      {"Ask each time", :ask},
      {"Always", :always}
    ]
  end

  @spec visibility_options() :: [{String.t(), visibility()}]
  def visibility_options do
    [
      {"Public (listed in browse)", :public},
      {"Unlisted (direct link only)", :unlisted}
    ]
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
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
