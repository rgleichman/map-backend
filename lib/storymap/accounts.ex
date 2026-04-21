defmodule Storymap.Accounts do
  @moduledoc """
  The Accounts context.
  """

  import Ecto.Query, warn: false
  alias Storymap.Repo

  alias Storymap.Accounts.{EmailIdentifier, User, UserToken, UserNotifier}
  alias Storymap.Accounts.Scope

  ## Database getters

  @doc """
  Gets a user by email address using the stored HMAC identifier (plaintext email is not persisted).
  """
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email_hmac: EmailIdentifier.hash(email))
  end

  @doc """
  Gets a single user.

  Raises `Ecto.NoResultsError` if the User does not exist.

  ## Examples

      iex> get_user!(123)
      %User{}

      iex> get_user!(456)
      ** (Ecto.NoResultsError)

  """
  def get_user!(id), do: Repo.get!(User, id)

  def list_users_for_admin(%Scope{user: %User{admin_level: admin_level}})
      when admin_level >= 10 do
    from(u in User, order_by: [desc: u.inserted_at])
    |> Repo.all()
  end

  def list_users_for_admin(_scope), do: []

  def update_user_admin_level(
        %Scope{user: %User{admin_level: admin_level}},
        %User{} = user,
        attrs
      )
      when admin_level >= 10 do
    user
    |> User.admin_level_changeset(attrs)
    |> Repo.update()
  end

  def update_user_admin_level(_scope, _user, _attrs), do: {:error, :unauthorized}

  def set_user_muted(%Scope{user: %User{admin_level: admin_level}}, %User{} = user, muted?)
      when admin_level >= 10 and is_boolean(muted?) do
    user
    |> User.muted_changeset(muted?)
    |> Repo.update()
  end

  def set_user_muted(_scope, _user, _muted?), do: {:error, :unauthorized}

  ## User registration

  @doc """
  Registers a user.

  ## Examples

      iex> register_user(%{field: value})
      {:ok, %User{}}

      iex> register_user(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def register_user(attrs) do
    %User{}
    |> User.email_changeset(attrs)
    |> Repo.insert()
  end

  ## Settings

  @doc """
  Checks whether the user is in sudo mode.

  The user is in sudo mode when the last authentication was done no further
  than 20 minutes ago. The limit can be given as second argument in minutes.
  """
  def sudo_mode?(user, minutes \\ -20)

  def sudo_mode?(%User{authenticated_at: ts}, minutes) when is_struct(ts, DateTime) do
    DateTime.after?(ts, DateTime.utc_now() |> DateTime.add(minutes, :minute))
  end

  def sudo_mode?(_user, _minutes), do: false

  @doc """
  Returns an `%Ecto.Changeset{}` for changing the user email.

  See `Storymap.Accounts.User.email_changeset/3` for a list of supported options.

  ## Examples

      iex> change_user_email(user)
      %Ecto.Changeset{data: %User{}}

  """
  def change_user_email(user, attrs \\ %{}, opts \\ []) do
    User.email_changeset(user, attrs, opts)
  end

  @doc """
  Updates the user email using the given token.

  If the token matches, the user email is updated and the token is deleted.
  """
  def update_user_email(user, token) do
    context = EmailIdentifier.change_email_context(user)

    Repo.transact(fn ->
      with {:ok, query} <- UserToken.verify_change_email_token_query(token, context),
           %UserToken{sent_to: new_email_hmac} <- Repo.one(query),
           {:ok, user} <- Repo.update(User.email_hmac_changeset(user, new_email_hmac)),
           {_count, _result} <-
             Repo.delete_all(from(UserToken, where: [user_id: ^user.id, context: ^context])) do
        {:ok, user}
      else
        _ -> {:error, :transaction_aborted}
      end
    end)
  end

  ## Session

  @doc """
  Generates a session token.
  """
  def generate_user_session_token(user) do
    {token, user_token} = UserToken.build_session_token(user)
    Repo.insert!(user_token)
    token
  end

  @doc """
  Gets the user with the given signed token.

  If the token is valid `{user, token_inserted_at}` is returned, otherwise `nil` is returned.
  """
  def get_user_by_session_token(token) do
    {:ok, query} = UserToken.verify_session_token_query(token)
    Repo.one(query)
  end

  @doc """
  Gets the user with the given magic link token.
  """
  def get_user_by_magic_link_token(token) do
    with {:ok, query} <- UserToken.verify_magic_link_token_query(token),
         {user, _token} <- Repo.one(query) do
      user
    else
      _ -> nil
    end
  end

  @doc """
  Logs the user in by magic link.

  There are three cases to consider:

  1. The user has already confirmed their email. They are logged in
     and the magic link is expired.

  2. The user has not confirmed their email and no password is set.
     In this case, the user gets confirmed, logged in, and all tokens -
     including session ones - are expired. In theory, no other tokens
     exist but we delete all of them for best security practices.

  3. The user has not confirmed their email but a password is set.
     This cannot happen in the default implementation but may be the
     source of security pitfalls. See the "Mixing magic link and password registration" section of
     `mix help phx.gen.auth`.
  """
  def login_user_by_magic_link(token) do
    {:ok, query} = UserToken.verify_magic_link_token_query(token)

    case Repo.one(query) do
      {%User{confirmed_at: nil} = user, _token} ->
        user
        |> User.confirm_changeset()
        |> update_user_and_delete_all_tokens()

      {user, token} ->
        Repo.delete!(token)
        {:ok, {user, []}}

      nil ->
        {:error, :not_found}
    end
  end

  @doc """
  Delivers update-email instructions to `new_email` (plaintext used only for delivery).
  """
  def deliver_user_update_email_instructions(
        %User{} = user,
        new_email,
        update_email_url_fun
      )
      when is_binary(new_email) and is_function(update_email_url_fun, 1) do
    context = EmailIdentifier.change_email_context(user)
    new_hmac = EmailIdentifier.hash(new_email)

    {encoded_token, user_token} = UserToken.build_email_token(user, context, new_hmac)

    Repo.insert!(user_token)

    UserNotifier.deliver_update_email_instructions(
      new_email,
      update_email_url_fun.(encoded_token)
    )
  end

  @doc """
  Delivers the magic link login instructions to the given user.
  """
  def deliver_login_instructions(%User{} = user, recipient_email, magic_link_url_fun)
      when is_binary(recipient_email) and is_function(magic_link_url_fun, 1) do
    {encoded_token, user_token} =
      UserToken.build_email_token(user, "login", user.email_hmac)

    Repo.insert!(user_token)

    UserNotifier.deliver_login_instructions(
      recipient_email,
      magic_link_url_fun.(encoded_token),
      user
    )
  end

  @doc """
  Deletes the signed token with the given context.
  """
  def delete_user_session_token(token) do
    Repo.delete_all(from(UserToken, where: [token: ^token, context: "session"]))
    :ok
  end

  ## Token helper

  defp update_user_and_delete_all_tokens(changeset) do
    Repo.transact(fn ->
      with {:ok, user} <- Repo.update(changeset) do
        tokens_to_expire = Repo.all_by(UserToken, user_id: user.id)

        Repo.delete_all(from(t in UserToken, where: t.id in ^Enum.map(tokens_to_expire, & &1.id)))

        {:ok, {user, tokens_to_expire}}
      end
    end)
  end

  @doc """
  Deletes a user and all their pins.

  ## Examples

      iex> delete_user(user)
      {:ok, %User{}}

      iex> delete_user(user)
      {:error, reason}

  """
  def delete_user(%User{} = user) do
    Repo.transact(fn ->
      # Delete all pins for the user
      from(p in Storymap.Pins.Pin, where: p.user_id == ^user.id)
      |> Repo.delete_all()

      # Delete all tokens for the user
      from(t in UserToken, where: t.user_id == ^user.id)
      |> Repo.delete_all()

      # Delete the user
      Repo.delete(user)
    end)
  end
end
