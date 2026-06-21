defmodule Storymap.ContentReports.ContentReport do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @categories ~w(inaccurate abusive_or_hateful spam other)

  @type t :: %__MODULE__{
          id: integer() | nil,
          subject_type: String.t() | nil,
          subject_id: integer() | nil,
          subject_label: String.t() | nil,
          category: String.t() | nil,
          details: String.t() | nil,
          resolved_at: DateTime.t() | nil,
          reporter_user_id: integer() | nil,
          sub_map_id: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "content_reports" do
    field :subject_type, :string
    field :subject_id, :integer
    field :subject_label, :string
    field :category, :string
    field :details, :string
    field :resolved_at, :utc_datetime

    belongs_to :reporter, Storymap.Accounts.User, foreign_key: :reporter_user_id
    belongs_to :sub_map, Storymap.SubMaps.SubMap

    timestamps(type: :utc_datetime)
  end

  def categories, do: @categories

  def create_changeset(attrs, opts \\ []) do
    reporter_user_id = Keyword.get(opts, :reporter_user_id)

    %__MODULE__{}
    |> cast(attrs, [:subject_type, :subject_id, :subject_label, :category, :details, :sub_map_id])
    |> validate_required([:subject_type, :subject_id, :category])
    |> validate_inclusion(:subject_type, ["pin"])
    |> validate_inclusion(:category, @categories)
    |> validate_number(:subject_id, greater_than: 0)
    |> validate_length(:details, max: 2000)
    |> maybe_put_reporter(reporter_user_id)
  end

  defp maybe_put_reporter(changeset, user_id) when is_integer(user_id) do
    put_change(changeset, :reporter_user_id, user_id)
  end

  defp maybe_put_reporter(changeset, _), do: changeset

  def resolve_changeset(%__MODULE__{} = report) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    change(report, %{resolved_at: now})
  end

  def unresolve_changeset(%__MODULE__{} = report) do
    change(report, %{resolved_at: nil})
  end
end
