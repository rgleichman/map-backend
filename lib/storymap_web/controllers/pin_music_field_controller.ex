defmodule StorymapWeb.PinMusicFieldController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.Authorizer
  alias Storymap.SubMaps

  action_fallback StorymapWeb.FallbackController

  def show(conn, %{"id" => id, "field_key" => field_key}) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    current_user = conn.assigns.current_scope.user
    {sub_map, membership} = sub_map_and_membership(pin, current_user)
    opts = [sub_map: sub_map, membership: membership, user: current_user]

    case Authorizer.authorize_update(current_user, pin, opts) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        case Pins.get_music_blob(pin.id, field_key) do
          nil ->
            {:error, :not_found}

          blob ->
            render(conn, :show, blob: blob)
        end
    end
  end

  def create(conn, %{"id" => id, "field_key" => field_key} = params) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    current_user = conn.assigns.current_scope.user
    {sub_map, membership} = sub_map_and_membership(pin, current_user)
    opts = [sub_map: sub_map, membership: membership, user: current_user]

    case Authorizer.authorize_update(current_user, pin, opts) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        with {:ok, %{pin: pin}} <-
               Pins.upsert_music_blob(pin, field_key, music_field_params(params)) do
          pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

          conn
          |> put_view(StorymapWeb.PinJSON)
          |> render(:show,
            pin: pin,
            current_user: current_user,
            sub_map: sub_map,
            membership: membership
          )
        else
          {:error, :invalid_music_field} ->
            invalid_music_field(conn)

          other ->
            other
        end
    end
  end

  def update(conn, %{"id" => id, "field_key" => field_key} = params) do
    create(conn, Map.put(params, "id", id) |> Map.put("field_key", field_key))
  end

  def delete(conn, %{"id" => id, "field_key" => field_key}) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    current_user = conn.assigns.current_scope.user
    {sub_map, membership} = sub_map_and_membership(pin, current_user)
    opts = [sub_map: sub_map, membership: membership, user: current_user]

    case Authorizer.authorize_update(current_user, pin, opts) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        with {:ok, pin} <- Pins.delete_music_blob(pin, field_key) do
          pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

          conn
          |> put_view(StorymapWeb.PinJSON)
          |> render(:show,
            pin: pin,
            current_user: current_user,
            sub_map: sub_map,
            membership: membership
          )
        else
          {:error, :invalid_music_field} ->
            invalid_music_field(conn)

          {:error, :required_music_field} ->
            required_music_field(conn)

          other ->
            other
        end
    end
  end

  defp music_field_params(%{"music_field" => %{} = params}), do: params

  defp music_field_params(%{"payload" => _} = params),
    do: Map.take(params, ["payload", "format", "version"])

  defp music_field_params(%{payload: _} = params),
    do: Map.take(params, [:payload, :format, :version])

  defp music_field_params(_), do: %{}

  defp sub_map_and_membership(pin, user) do
    sub_map = pin.sub_map
    membership = if sub_map, do: SubMaps.get_membership(sub_map.id, user.id), else: nil
    {sub_map, membership}
  end

  defp invalid_music_field(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{field_key: ["is not a music field for this pin type"]}})
  end

  defp required_music_field(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{field_key: ["cannot delete required field"]}})
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"403")
  end
end
