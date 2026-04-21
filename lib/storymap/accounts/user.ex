defmodule Storymap.Accounts.User do
  use Ecto.Schema
  import Ecto.Query
  import Ecto.Changeset

  alias Storymap.Accounts.EmailIdentifier
  alias Storymap.Repo

  schema "users" do
    field :email_hmac, :binary
    field :email, :string, virtual: true
    field :admin_level, :integer, default: 0
    field :muted_at, :utc_datetime
    field :confirmed_at, :utc_datetime
    field :authenticated_at, :utc_datetime, virtual: true

    has_many :pins, Storymap.Pins.Pin

    timestamps(type: :utc_datetime)
  end

  @doc """
  A user changeset for registering or changing the email.

  It requires the email to change otherwise an error is added.

  ## Options

    * `:validate_unique` - Set to false if you don't want to validate the
      uniqueness of the email, useful when displaying live validations.
      Defaults to `true`.
  """
  def email_changeset(user, attrs, opts \\ []) do
    user
    |> cast(attrs, [:email])
    |> validate_email(opts)
  end

  defp validate_email(changeset, opts) do
    changeset =
      changeset
      |> validate_required([:email])
      |> validate_format(:email, ~r/^[^@,;\s]+@[^@,;\s]+$/,
        message: "must have the @ sign and no spaces"
      )
      |> validate_length(:email, max: 160)
      |> put_email_hmac_from_change()

    changeset =
      if Keyword.get(opts, :validate_unique, true) do
        validate_unique_email_hmac(changeset, opts)
      else
        changeset
      end

    changeset
    |> validate_email_changed()
  end

  defp put_email_hmac_from_change(changeset) do
    case get_change(changeset, :email) do
      nil -> changeset
      email -> put_change(changeset, :email_hmac, EmailIdentifier.hash(email))
    end
  end

  defp validate_unique_email_hmac(changeset, _opts) do
    case get_change(changeset, :email_hmac) do
      nil ->
        changeset

      hmac ->
        id = changeset.data.id

        query =
          from u in __MODULE__,
            where: u.email_hmac == ^hmac

        query =
          if id,
            do: where(query, [u], u.id != ^id),
            else: query

        if Repo.exists?(query),
          do: add_error(changeset, :email, "has already been taken"),
          else: changeset
    end
  end

  defp validate_email_changed(changeset) do
    case {get_change(changeset, :email), changeset.data.email_hmac} do
      {nil, _} ->
        changeset

      {_new, nil} ->
        changeset

      {new_email, old_hmac} when is_binary(new_email) and is_binary(old_hmac) ->
        if EmailIdentifier.hash(new_email) == old_hmac do
          add_error(changeset, :email, "did not change")
        else
          changeset
        end

      _ ->
        changeset
    end
  end

  @doc """
  Updates `email_hmac` from a precomputed binary (e.g. email change confirmation).
  """
  def email_hmac_changeset(user, new_email_hmac) when is_binary(new_email_hmac) do
    change(user, email_hmac: new_email_hmac)
  end

  @doc """
  Confirms the account by setting `confirmed_at`.
  """
  def confirm_changeset(user) do
    now = DateTime.utc_now(:second)
    change(user, confirmed_at: now)
  end

  def admin_level_changeset(user, attrs) do
    user
    |> cast(attrs, [:admin_level])
    |> validate_required([:admin_level])
    |> validate_number(:admin_level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
  end

  def muted_changeset(user, muted?) when is_boolean(muted?) do
    muted_at = if muted?, do: DateTime.utc_now(:second), else: nil
    change(user, muted_at: muted_at)
  end
end
