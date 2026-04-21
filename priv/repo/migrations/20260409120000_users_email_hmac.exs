defmodule Storymap.Repo.Migrations.UsersEmailHmac do
  use Ecto.Migration
  import Ecto.Query

  def up do
    alter table(:users) do
      add :email_hmac, :binary
    end

    flush()

    execute("DELETE FROM users_tokens")

    flush()

    alter table(:users_tokens) do
      remove :sent_to
    end

    flush()

    alter table(:users_tokens) do
      add :sent_to, :binary
    end

    flush()

    secret = fetch_secret!()

    for %{id: id, email: email} <-
          Storymap.Repo.all(from(u in "users", select: %{id: u.id, email: u.email})) do
      hmac = hmac_normalized_email(email, secret)

      {1, _} =
        Storymap.Repo.update_all(from(u in "users", where: u.id == ^id), set: [email_hmac: hmac])
    end

    flush()

    create unique_index(:users, [:email_hmac])

    flush()

    drop unique_index(:users, [:email])

    alter table(:users) do
      remove :email
    end

    execute("ALTER TABLE users ALTER COLUMN email_hmac SET NOT NULL")
  end

  def down do
    raise Ecto.MigrationError, "irreversible: plaintext emails cannot be restored from email_hmac"
  end

  defp fetch_secret! do
    Application.fetch_env!(:storymap, :email_identifier_secret)
  end

  defp hmac_normalized_email(email, secret) when is_binary(email) and is_binary(secret) do
    normalized = email |> String.trim() |> String.downcase()
    :crypto.mac(:hmac, :sha3_512, secret, normalized)
  end
end
