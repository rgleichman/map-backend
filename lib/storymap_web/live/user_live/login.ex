defmodule StorymapWeb.UserLive.Login do
  use StorymapWeb, :live_view

  alias Storymap.Accounts

  @success_flash "Email sent. Please check your inbox for a link to log in or create an account."

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="mx-auto max-w-sm space-y-4">
        <div class="text-center">
          <.header>
            <p>Sign in or create an account</p>
            <:subtitle :if={@current_scope}>
              You need to reauthenticate to perform sensitive actions on your account.
            </:subtitle>
            <:subtitle :if={is_nil(@current_scope)}>
              Enter your email and we'll send you a link to create an account if you are new, or log in if you are returning. Happy Planting!
            </:subtitle>
          </.header>
        </div>

        <div :if={local_mail_adapter?()} class="alert alert-info">
          <.icon name="hero-information-circle" class="size-6 shrink-0" />
          <div>
            <p>You are running the local mail adapter.</p>
            <p>
              To see sent emails, visit <.link href="/dev/mailbox" class="underline">the mailbox page</.link>.
            </p>
          </div>
        </div>

        <.form
          :let={f}
          for={@form}
          id="login_form_magic"
          action={~p"/users/log-in"}
          phx-submit="submit_magic"
        >
          <.input
            readonly={false}
            field={f[:email]}
            type="email"
            label="Email"
            autocomplete="username"
            required
            phx-mounted={JS.focus()}
          />
          <p class="text-sm text-warning mb-3 flex gap-2 items-start">
            <.icon name="hero-exclamation-triangle" class="size-5 shrink-0 mt-0.5" />
            <span>
              Please remember your email. We store addresses securely and cannot recover your account if you forget it.
            </span>
          </p>
          <.button variant="primary" class="w-full">
            Continue with email <span aria-hidden="true">→</span>
          </.button>
        </.form>
      </div>
    </Layouts.app>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    email = Phoenix.Flash.get(socket.assigns.flash, :email) || ""

    form = to_form(%{"email" => email}, as: "user")

    {:ok, assign(socket, form: form, trigger_submit: false)}
  end

  @impl true
  def handle_event("submit_magic", %{"user" => %{"email" => email}}, socket) do
    url_fun = &url(~p"/users/log-in/#{&1}")

    result =
      if reauthenticating?(socket) do
        Accounts.deliver_reauth_login_instructions(email, url_fun)
      else
        Accounts.deliver_login_or_register_instructions(email, url_fun)
      end

    case result do
      {:ok, _} ->
        {:noreply,
         socket
         |> put_flash(:info, @success_flash)
         |> put_flash(:email, email)
         |> push_navigate(to: ~p"/users/log-in")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, Map.put(changeset, :action, :insert))}
    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    form = to_form(changeset, as: "user")
    assign(socket, form: form)
  end

  defp reauthenticating?(%{assigns: %{current_scope: %{user: %Accounts.User{}}}}), do: true
  defp reauthenticating?(_), do: false

  defp local_mail_adapter? do
    Application.get_env(:storymap, Storymap.Mailer)[:adapter] == Swoosh.Adapters.Local
  end
end
