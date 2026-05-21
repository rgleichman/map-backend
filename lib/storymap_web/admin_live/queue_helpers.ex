defmodule StorymapWeb.AdminLive.QueueHelpers do
  @moduledoc false

  import Phoenix.Component

  alias Storymap.AdminActivity

  def apply_counts_changed(socket, admin_user_id, counts, assign_key, count_field) do
    if admin_user_id == socket_user_id(socket) do
      assign(socket, assign_key, Map.fetch!(counts, count_field))
    else
      socket
    end
  end

  def refresh_read_event_ids(socket, scope, streamed_ids_key) do
    event_ids = MapSet.to_list(Map.fetch!(socket.assigns, streamed_ids_key))

    read_event_ids =
      AdminActivity.read_event_ids_for_admin(scope, event_ids) |> MapSet.new()

    assign(socket, :read_event_ids, read_event_ids)
  end

  defp socket_user_id(%{assigns: %{current_scope: %{user: %{id: id}}}}), do: id
  defp socket_user_id(%{assigns: %{user_id: id}}) when is_integer(id), do: id
  defp socket_user_id(_), do: nil
end
