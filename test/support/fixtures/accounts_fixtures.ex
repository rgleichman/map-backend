defmodule Storymap.AccountsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Storymap.Accounts` context.
  """

  import Ecto.Query

  alias Storymap.Accounts
  alias Storymap.Accounts.EmailIdentifier
  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.Repo

  @process_emails_key {__MODULE__, :registered_user_emails}

  def unique_user_email, do: "user#{System.unique_integer()}@example.com"

  def valid_user_attributes(attrs \\ %{}) do
    Enum.into(attrs, %{
      email: unique_user_email()
    })
  end

  @doc """
  Returns the email string used when registering the user (plaintext is not stored on `%User{}`).
  """
  def registered_email(%User{id: id}) do
    Process.get(@process_emails_key, %{})
    |> Map.fetch!(id)
  end

  defp remember_registered_email(%User{id: id}, email)
       when is_binary(email) do
    map = Process.get(@process_emails_key, %{})
    Process.put(@process_emails_key, Map.put(map, id, email))
  end

  @doc """
  Inserts a confirmed user with a single `Repo.insert!` (no register / magic-link side effects).
  Accepts `:email`, `:admin_level`, `:muted_at`, and `:confirmed_at`.
  """
  def user_fixture(attrs \\ %{}) do
    insert_user!(attrs)
  end

  @doc """
  Inserts an unconfirmed user (`confirmed_at: nil`) without calling `Accounts.register_user/1`.
  """
  def unconfirmed_user_fixture(attrs \\ %{}) do
    insert_user!(Map.put(attrs, :confirmed_at, nil))
  end

  defp insert_user!(attrs) when is_map(attrs) do
    attrs = Map.new(attrs, fn {k, v} -> {to_string(k), v} end)
    email = Map.get(attrs, "email") || unique_user_email()
    now = DateTime.utc_now(:second)

    confirmed_at =
      case Map.fetch(attrs, "confirmed_at") do
        {:ok, value} -> value
        :error -> now
      end

    user =
      %User{
        email_hmac: EmailIdentifier.hash(email),
        confirmed_at: confirmed_at,
        admin_level: Map.get(attrs, "admin_level", 0),
        muted_at: Map.get(attrs, "muted_at")
      }
      |> Repo.insert!()

    remember_registered_email(user, email)
    user
  end

  def user_scope_fixture do
    user = user_fixture()
    user_scope_fixture(user)
  end

  def user_scope_fixture(user) do
    Scope.for_user(user)
  end

  def extract_user_token(fun) do
    {:ok, captured_email} = fun.(&"[TOKEN]#{&1}[TOKEN]")
    [_, token | _] = String.split(captured_email.text_body, "[TOKEN]")
    token
  end

  def override_token_authenticated_at(token, authenticated_at) when is_binary(token) do
    Storymap.Repo.update_all(
      from(t in Accounts.UserToken,
        where: t.token == ^token
      ),
      set: [authenticated_at: authenticated_at]
    )
  end

  def generate_user_magic_link_token(user) do
    {encoded_token, user_token} =
      Accounts.UserToken.build_email_token(user, "login", user.email_hmac)

    Storymap.Repo.insert!(user_token)
    {encoded_token, user_token.token}
  end

  def offset_user_token(token, amount_to_add, unit) do
    dt = DateTime.add(DateTime.utc_now(:second), amount_to_add, unit)

    Storymap.Repo.update_all(
      from(ut in Accounts.UserToken, where: ut.token == ^token),
      set: [inserted_at: dt, authenticated_at: dt]
    )
  end

  def muted_user_fixture(user_or_attrs \\ %{})

  def muted_user_fixture(%User{} = user) do
    Repo.update!(Ecto.Changeset.change(user, muted_at: DateTime.utc_now(:second)))
  end

  def muted_user_fixture(attrs) when is_map(attrs) do
    muted_at =
      Map.get(attrs, :muted_at) || Map.get(attrs, "muted_at") || DateTime.utc_now(:second)

    user_fixture(Map.put(attrs, :muted_at, muted_at))
  end
end
