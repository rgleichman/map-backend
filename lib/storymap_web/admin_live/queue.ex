defmodule StorymapWeb.AdminLive.Queue do
  @moduledoc false

  defmacro __using__(_opts) do
    quote do
      @page_size 50

      defp parse_id(id) when is_binary(id) do
        case Integer.parse(id) do
          {int_id, ""} -> {:ok, int_id}
          _ -> :error
        end
      end

      defp parse_id(id) when is_integer(id), do: {:ok, id}
      defp parse_id(_), do: :error

      defp subscribe_admin_pubsub(socket) do
        if connected?(socket) do
          Storymap.AdminPubSub.subscribe()
        end

        socket
      end

      defp sync_admin_nav(socket) do
        if connected?(socket) do
          StorymapWeb.AdminNavSync.sync_admin_nav(socket)
        else
          socket
        end
      end
    end
  end
end
