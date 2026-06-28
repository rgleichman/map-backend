defmodule Storymap.Pins.PinComment do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @max_body_length 2000

  @type t :: %__MODULE__{
          id: integer() | nil,
          pin_id: integer() | nil,
          user_id: integer() | nil,
          parent_id: integer() | nil,
          body: String.t() | nil,
          deleted_at: DateTime.t() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "pin_comments" do
    field :body, :string
    field :deleted_at, :utc_datetime

    belongs_to :pin, Storymap.Pins.Pin
    belongs_to :user, Storymap.Accounts.User
    belongs_to :parent, __MODULE__

    has_many :replies, __MODULE__, foreign_key: :parent_id

    timestamps(type: :utc_datetime)
  end

  @spec create_changeset(t(), map(), keyword()) :: Ecto.Changeset.t()
  def create_changeset(%__MODULE__{} = comment, attrs, opts) when is_list(opts) do
    pin_id = Keyword.fetch!(opts, :pin_id)
    user_id = Keyword.fetch!(opts, :user_id)
    parent = Keyword.get(opts, :parent)

    comment
    |> cast(attrs, [:body, :parent_id])
    |> put_change(:pin_id, pin_id)
    |> put_change(:user_id, user_id)
    |> validate_required([:body])
    |> validate_length(:body, min: 1, max: @max_body_length)
    |> validate_parent_comment(parent, pin_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(%__MODULE__{} = comment, attrs) do
    comment
    |> cast(attrs, [:body])
    |> validate_required([:body])
    |> validate_length(:body, min: 1, max: @max_body_length)
    |> validate_not_deleted()
  end

  @spec delete_changeset(t()) :: Ecto.Changeset.t()
  def delete_changeset(%__MODULE__{} = comment) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    change(comment, %{deleted_at: now})
  end

  @spec deleted?(%__MODULE__{}) :: boolean()
  def deleted?(%__MODULE__{deleted_at: %DateTime{}}), do: true
  def deleted?(_), do: false

  defp validate_not_deleted(
         %Ecto.Changeset{data: %__MODULE__{deleted_at: %DateTime{}}} = changeset
       ) do
    add_error(changeset, :body, "cannot edit a deleted comment")
  end

  defp validate_not_deleted(changeset), do: changeset

  defp validate_parent_comment(changeset, nil, _pin_id) do
    case get_field(changeset, :parent_id) do
      nil -> changeset
      _ -> add_error(changeset, :parent_id, "invalid parent")
    end
  end

  defp validate_parent_comment(changeset, %__MODULE__{} = parent, pin_id) do
    cond do
      parent.pin_id != pin_id ->
        add_error(changeset, :parent_id, "parent must belong to the same pin")

      parent.parent_id != nil ->
        add_error(changeset, :parent_id, "cannot reply to a reply")

      deleted?(parent) ->
        add_error(changeset, :parent_id, "cannot reply to a deleted comment")

      true ->
        changeset
    end
  end
end
