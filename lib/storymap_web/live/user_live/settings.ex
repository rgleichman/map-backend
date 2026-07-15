defmodule StorymapWeb.UserLive.Settings do
  use StorymapWeb, :live_view

  on_mount {StorymapWeb.UserAuth, :require_sudo_mode}

  alias Storymap.Accounts

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="text-center">
        <.header>
          Account Settings
          <:subtitle>Manage your account email address settings</:subtitle>
        </.header>
      </div>

      <.form for={@email_form} id="email_form" phx-submit="update_email" phx-change="validate_email">
        <.input
          field={@email_form[:email]}
          type="email"
          label="Email"
          autocomplete="username"
          required
        />
        <.button variant="primary" phx-disable-with="Changing...">Change Email</.button>
      </.form>

      <div class="divider" />
      <span class="label mb-1">Toggle Light / Dark Theme</span>
      <.theme_toggle />

      <div class="mt-12 flex flex-col items-center">
        <.button
          id="delete-account-btn"
          variant="danger_outline"
          class="w-full max-w-xs text-base font-semibold inline-flex items-center justify-center"
          phx-click="show_delete_modal"
        >
          <.icon name="hero-trash" class="size-5 mr-2" /> Delete Account
        </.button>
      </div>

      <.confirm_modal
        :if={@show_delete_modal}
        id="delete-account-modal"
        title="Delete Account?"
        on_cancel="hide_delete_modal"
        on_confirm="confirm_delete_account"
        confirm_label="Confirm Delete"
        confirm_id="confirm-delete-btn"
        cancel_id="cancel-delete-btn"
      >
        Are you sure you want to delete your account? This will delete all the pins and comments you have created and cannot be undone.
      </.confirm_modal>
    </Layouts.app>
    """
  end

  @impl true
  def mount(%{"token" => token}, _session, socket) do
    socket =
      case Accounts.update_user_email(socket.assigns.current_scope.user, token) do
        {:ok, _user} ->
          put_flash(socket, :info, "Email changed successfully.")

        {:error, _} ->
          put_flash(socket, :error, "Email change link is invalid or it has expired.")
      end

    {:ok, push_navigate(socket, to: ~p"/users/settings")}
  end

  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user
    email_changeset = Accounts.change_user_email(user, %{}, validate_unique: false)

    socket =
      socket
      |> assign(:email_form, to_form(email_changeset))
      |> assign(:trigger_submit, false)
      |> assign(:show_delete_modal, false)

    {:ok, socket}
  end

  @impl true
  def handle_event("show_delete_modal", _params, socket) do
    {:noreply, assign(socket, :show_delete_modal, true)}
  end

  @impl true
  def handle_event("hide_delete_modal", _params, socket) do
    {:noreply, assign(socket, :show_delete_modal, false)}
  end

  @impl true
  def handle_event("confirm_delete_account", _params, socket) do
    user = socket.assigns.current_scope.user

    if Accounts.sudo_mode?(user) do
      case Storymap.Accounts.delete_user(user) do
        {:ok, _} ->
          {:noreply,
           socket
           |> assign(:show_delete_modal, false)
           |> Phoenix.LiveView.redirect(to: "/")
           |> put_flash(:info, "Your account has been deleted.")}

        {:error, _reason} ->
          {:noreply,
           socket
           |> assign(:show_delete_modal, false)
           |> put_flash(:error, "There was a problem deleting your account. Please try again.")}
      end
    else
      {:noreply,
       socket
       |> assign(:show_delete_modal, false)
       |> put_flash(
         :error,
         "For security, please log in to your account again before deleting."
       )
       |> push_navigate(to: ~p"/users/settings")}
    end
  end

  @impl true
  def handle_event("validate_email", params, socket) do
    %{"user" => user_params} = params

    email_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_email(user_params, validate_unique: false)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, email_form: email_form)}
  end

  def handle_event("update_email", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.change_user_email(user, user_params) do
      %{valid?: true} = changeset ->
        new_email = Ecto.Changeset.get_change(changeset, :email)

        Accounts.deliver_user_update_email_instructions(
          user,
          new_email,
          &url(~p"/users/settings/confirm-email/#{&1}")
        )

        info = "A link to confirm your email change has been sent to the new address."
        {:noreply, socket |> put_flash(:info, info)}

      changeset ->
        {:noreply, assign(socket, :email_form, to_form(changeset, action: :insert))}
    end
  end
end
