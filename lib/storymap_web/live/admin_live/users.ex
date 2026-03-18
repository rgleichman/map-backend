defmodule StorymapWeb.AdminLive.Users do
  use StorymapWeb, :live_view

  alias Storymap.Accounts
  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User

  @impl true
  def mount(_params, _session, socket) do
    users = Accounts.list_users_for_admin(socket.assigns.current_scope)

    {:ok,
     socket
     |> assign(:page_title, "Admin · Users")
     |> stream(:users, users)}
  end

  @impl true
  def handle_event("mute_toggle", %{"id" => id, "muted" => muted}, socket) do
    target_user = Accounts.get_user!(String.to_integer(id))

    current_user = Accounts.get_user!(socket.assigns.current_scope.user.id)
    scope = Scope.for_user(current_user)

    muted? = muted == "true"

    if current_user.admin_level < 10 do
      {:noreply,
       socket
       |> put_flash(:error, "You are not authorized to mute users.")
       |> push_navigate(to: ~p"/")}
    else
      case Accounts.set_user_muted(scope, target_user, muted?) do
        {:ok, %User{} = updated_user} ->
          {:noreply,
           socket
           |> put_flash(:info, mute_flash_message(updated_user))
           |> stream_insert(:users, updated_user)}

        {:error, :unauthorized} ->
          {:noreply, socket |> put_flash(:error, "You are not authorized to mute users.")}

        _ ->
          {:noreply, socket |> put_flash(:error, "Could not update mute status.")}
      end
    end
  end

  @impl true
  def handle_event(
        "save_admin_level",
        %{"_id" => id, "user" => %{"admin_level" => admin_level}},
        socket
      ) do
    id = String.to_integer(id)
    target_user = Accounts.get_user!(id)

    # Re-fetch current user so a demoted admin cannot keep acting with stale session
    current_user = Accounts.get_user!(socket.assigns.current_scope.user.id)
    scope = Scope.for_user(current_user)

    if current_user.admin_level < 10 do
      {:noreply,
       socket
       |> put_flash(:error, "You are not authorized to change admin levels.")
       |> push_navigate(to: ~p"/")}
    else
      with {:ok, %User{} = updated_user} <-
             Accounts.update_user_admin_level(scope, target_user, %{
               "admin_level" => admin_level
             }) do
        {:noreply,
         socket
         |> put_flash(:info, "Updated admin level for #{updated_user.email}.")
         |> stream_insert(:users, updated_user)}
      else
        {:error, %Ecto.Changeset{} = changeset} ->
          {:noreply, socket |> put_flash(:error, changeset_error_message(changeset))}

        {:error, :unauthorized} ->
          {:noreply,
           socket |> put_flash(:error, "You are not authorized to change admin levels.")}

        _ ->
          {:noreply, socket |> put_flash(:error, "Could not update admin level.")}
      end
    end
  end

  defp changeset_error_message(changeset) do
    errors =
      changeset.errors
      |> Enum.map(fn {field, _} -> field end)
      |> Enum.uniq()

    if :admin_level in errors do
      "Admin level must be between 0 and 10."
    else
      "Could not update admin level."
    end
  end

  defp mute_flash_message(%User{email: email, muted_at: nil}), do: "Unmuted #{email}."
  defp mute_flash_message(%User{email: email}), do: "Muted #{email}."

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
            <p class="text-sm opacity-80 mt-1">Manage user admin levels (0..10).</p>
          </div>
        </div>

        <div class="mt-6">
          <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table class="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Confirmed</th>
                  <th>Muted</th>
                  <th>Admin level</th>
                  <th class="text-right">User ID</th>
                </tr>
              </thead>
              <tbody id="admin-users" phx-update="stream">
                <tr :for={{dom_id, user} <- @streams.users} id={dom_id}>
                  <td class="font-medium">{user.email}</td>
                  <td>
                    <%= if user.confirmed_at do %>
                      <span class="badge badge-success badge-outline">Yes</span>
                    <% else %>
                      <span class="badge badge-ghost">No</span>
                    <% end %>
                  </td>
                  <td class="w-44">
                    <%= if user.muted_at do %>
                      <div class="flex items-center gap-2">
                        <span class="badge badge-warning badge-outline">Muted</span>
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs"
                          phx-click="mute_toggle"
                          phx-value-id={user.id}
                          phx-value-muted="false"
                        >
                          Unmute
                        </button>
                      </div>
                    <% else %>
                      <div class="flex items-center gap-2">
                        <span class="badge badge-ghost">No</span>
                        <button
                          type="button"
                          class="btn btn-outline btn-error btn-xs"
                          phx-click="mute_toggle"
                          phx-value-id={user.id}
                          phx-value-muted="true"
                        >
                          Mute
                        </button>
                      </div>
                    <% end %>
                  </td>
                  <td class="w-48">
                    <% form = to_form(%{"admin_level" => user.admin_level}, as: :user) %>

                    <.form for={form} id={"admin-level-form-#{user.id}"} phx-submit="save_admin_level">
                      <input type="hidden" name="_id" value={user.id} />
                      <.input
                        id={"user-#{user.id}-admin_level"}
                        field={form[:admin_level]}
                        type="select"
                        options={Enum.map(0..10, &{&1, &1})}
                      />
                      <button class="btn btn-primary btn-sm mt-2" type="submit">Save</button>
                    </.form>
                  </td>
                  <td class="text-right text-xs opacity-70">{user.id}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
