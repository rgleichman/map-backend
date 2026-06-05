defmodule StorymapWeb.UserLive.Confirmation do
  use StorymapWeb, :live_view

  alias Storymap.Accounts

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="mx-auto max-w-sm">
        <div class="text-center">
          <.header>Welcome</.header>
        </div>

        <.form
          :if={!@user.confirmed_at}
          for={@form}
          id="confirmation_form"
          phx-mounted={JS.focus_first()}
          action={~p"/users/log-in?_action=confirmed"}
          phx-trigger-action={@trigger_submit}
        >
          <input type="hidden" name="user[token]" value={@token} />
          <input :if={@remember_me} type="hidden" name="user[remember_me]" value="true" />
          <.button
            type="button"
            phx-click="submit_stay"
            phx-disable-with="Confirming..."
            class="btn btn-primary w-full"
          >
            Confirm and stay logged in
          </.button>
          <.button
            type="button"
            phx-click="submit_once"
            phx-disable-with="Confirming..."
            class="btn btn-primary btn-soft w-full mt-2"
          >
            Confirm and log in only this time
          </.button>
        </.form>

        <.form
          :if={@user.confirmed_at}
          for={@form}
          id="login_form"
          phx-mounted={JS.focus_first()}
          action={~p"/users/log-in"}
          phx-trigger-action={@trigger_submit}
        >
          <input type="hidden" name="user[token]" value={@token} />
          <input :if={@remember_me} type="hidden" name="user[remember_me]" value="true" />
          <%= if @current_scope do %>
            <.button
              type="button"
              phx-click="submit_once"
              phx-disable-with="Logging in..."
              class="btn btn-primary w-full"
            >
              Log in
            </.button>
          <% else %>
            <.button
              type="button"
              phx-click="submit_stay"
              phx-disable-with="Logging in..."
              class="btn btn-primary w-full"
            >
              Keep me logged in on this device
            </.button>
            <.button
              type="button"
              phx-click="submit_once"
              phx-disable-with="Logging in..."
              class="btn btn-primary btn-soft w-full mt-2"
            >
              Log me in only this time
            </.button>
          <% end %>
        </.form>
      </div>
    </Layouts.app>
    """
  end

  @impl true
  def mount(%{"token" => token}, _session, socket) do
    if user = Accounts.get_user_by_magic_link_token(token) do
      form = to_form(%{"token" => token}, as: "user")

      {:ok,
       assign(socket,
         user: user,
         token: token,
         form: form,
         remember_me: false,
         trigger_submit: false
       ), temporary_assigns: [form: nil]}
    else
      {:ok,
       socket
       |> put_flash(:error, "Magic link is invalid or it has expired.")
       |> push_navigate(to: ~p"/users/log-in")}
    end
  end

  @impl true
  def handle_event("submit_stay", _params, socket) do
    {:noreply, trigger_login(socket, true)}
  end

  def handle_event("submit_once", _params, socket) do
    {:noreply, trigger_login(socket, false)}
  end

  defp trigger_login(socket, remember_me) do
    params = %{"token" => socket.assigns.token}

    socket
    |> assign(:remember_me, remember_me)
    |> assign(:form, to_form(params, as: "user"))
    |> assign(:trigger_submit, true)
  end
end
