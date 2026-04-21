defmodule Storymap.Accounts.EmailIdentifier do
  @moduledoc """
  Derives a stable pseudonym from an email for database lookup without storing plaintext.

  Uses HMAC-SHA3-512 with `config :storymap, :email_identifier_secret` (see `runtime.exs` in prod).
  """

  alias Storymap.Accounts.User

  @doc """
  Normalizes an email for hashing (trim + lowercase).
  """
  def normalize(email) when is_binary(email), do: email |> String.trim() |> String.downcase()

  @doc """
  Returns the HMAC-SHA3-512 binary for the normalized email (64 bytes).
  """
  def hash(email) when is_binary(email) do
    normalized = normalize(email)
    :crypto.mac(:hmac, :sha3_512, secret(), normalized)
  end

  @doc """
  Context string for change-email tokens, binding the token to the user's current identifier.
  """
  def change_email_context(%User{id: id, email_hmac: hmac}) when is_binary(hmac) do
    "change:#{id}:#{Base.encode16(hmac, case: :lower)}"
  end

  defp secret do
    Application.fetch_env!(:storymap, :email_identifier_secret)
  end
end
