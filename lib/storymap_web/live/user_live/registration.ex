defmodule StorymapWeb.UserLive.Registration do
  use StorymapWeb, :live_view

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="mx-auto max-w-sm">
        <p class="text-center text-base-content/70">Redirecting…</p>
      </div>
    </Layouts.app>
    """
  end

  @impl true
  def mount(_params, _session, %{assigns: %{current_scope: %{user: user}}} = socket)
      when not is_nil(user) do
    {:ok, redirect(socket, to: StorymapWeb.UserAuth.signed_in_path(socket))}
  end

  def mount(_params, _session, socket) do
    {:ok, redirect(socket, to: ~p"/users/log-in")}
  end
end
