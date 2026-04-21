defmodule Storymap.Accounts.UserNotifier do
  import Swoosh.Email

  alias Storymap.Mailer
  alias Storymap.Accounts.User

  # Delivers the email using the application mailer.
  defp deliver(recipient, subject, body) do
    email =
      new()
      |> to(recipient)
      |> from({"Mapgarden", "no-reply@mapgarden.net"})
      |> subject(subject)
      |> text_body(body)

    with {:ok, _metadata} <- Mailer.deliver(email) do
      {:ok, email}
    end
  end

  @doc """
  Deliver instructions to update a user email (`recipient` is the new address).
  """
  def deliver_update_email_instructions(recipient, url) when is_binary(recipient) do
    deliver(recipient, "Update email instructions", """

    ==============================

    Hi,

    You can change your email by visiting the URL below:

    #{url}

    If you didn't request this change, please ignore this.

    ==============================
    """)
  end

  @doc """
  Deliver instructions to log in with a magic link or confirm a new account.
  """
  def deliver_login_instructions(recipient, url, %User{} = user) when is_binary(recipient) do
    case user do
      %User{confirmed_at: nil} -> deliver_confirmation_instructions(recipient, url)
      _ -> deliver_magic_link_instructions(recipient, url)
    end
  end

  defp deliver_magic_link_instructions(recipient, url) do
    deliver(recipient, "Log in instructions", """

    ==============================

    Hi,

    You can log into your account by visiting the URL below:

    #{url}

    If you didn't request this email, please ignore this.

    ==============================
    """)
  end

  defp deliver_confirmation_instructions(recipient, url) do
    deliver(recipient, "Confirmation instructions", """

    ==============================

    Hi,

    You can confirm your account by visiting the URL below:

    #{url}

    If you didn't create an account with us, please ignore this.

    ==============================
    """)
  end
end
