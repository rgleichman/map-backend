defmodule StorymapWeb.SubMapController do
  use StorymapWeb, :controller

  alias Storymap.SubMaps
  alias StorymapWeb.{ConnAuth, PinBroadcast, PinJSON, Plugs.LoadSubMap}

  action_fallback StorymapWeb.FallbackController

  plug LoadSubMap
       when action in [
              :show,
              :pins,
              :create_pin,
              :join,
              :leave,
              :approve_pin,
              :reject_pin,
              :update,
              :update_pin_type_settings
            ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    sub_maps = SubMaps.list_public(q: params["q"], sort: params["sort"])
    render(conn, :index, sub_maps: sub_maps, current_user: ConnAuth.current_user(conn))
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"sub_map" => params}) do
    scope = conn.assigns.current_scope

    case SubMaps.create_sub_map(scope, params) do
      {:ok, sub_map} ->
        conn
        |> put_status(:created)
        |> render(:show,
          sub_map: sub_map,
          current_user: scope.user,
          membership: SubMaps.get_membership(sub_map.id, scope.user.id),
          can_moderate: true,
          counts: SubMaps.counts(sub_map)
        )

      other ->
        other
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    render_show(conn)
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"sub_map" => params}) do
    scope = conn.assigns.current_scope
    sub_map = conn.assigns.sub_map

    case SubMaps.update_sub_map(scope, sub_map, params) do
      {:ok, sub_map} -> render_show(conn, sub_map)
      other -> other
    end
  end

  @spec update_pin_type_settings(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_pin_type_settings(conn, %{"pin_type_settings" => params}) do
    scope = conn.assigns.current_scope
    sub_map = conn.assigns.sub_map

    case SubMaps.update_pin_type_settings(scope, sub_map, params) do
      {:ok, sub_map} -> render_show(conn, sub_map)
      other -> other
    end
  end

  @spec pins(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def pins(conn, _params) do
    sub_map = conn.assigns.sub_map
    user = ConnAuth.current_user(conn)
    membership = conn.assigns.sub_map_membership
    pins = SubMaps.list_pins(sub_map, user, membership)

    render(conn, :pins,
      pins: pins,
      current_user: user,
      sub_map: sub_map,
      membership: membership
    )
  end

  @spec create_pin(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_pin(conn, %{"pin" => pin_params}) do
    scope = conn.assigns.current_scope
    sub_map = conn.assigns.sub_map

    case SubMaps.create_pin_in_sub_map(scope, sub_map, pin_params) do
      {:ok, pin} ->
        pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

        _ =
          Storymap.AdminActivity.record_event(
            "pin_created",
            scope.user.id,
            %{"pin_id" => pin.id, "title" => pin.title, "sub_map_id" => sub_map.id},
            sub_map_id: sub_map.id
          )

        PinBroadcast.broadcast_pin_event(pin, :created)

        conn
        |> put_status(:created)
        |> put_resp_header("location", ~p"/api/pins/#{pin}")
        |> put_view(json: PinJSON)
        |> render(:show,
          pin: pin,
          current_user: scope.user,
          sub_map: sub_map,
          membership: conn.assigns.sub_map_membership
        )

      other ->
        other
    end
  end

  @spec join(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def join(conn, _params) do
    scope = conn.assigns.current_scope

    case SubMaps.join(scope, conn.assigns.sub_map) do
      {:ok, membership} ->
        json(conn, %{
          data: %{role: to_string(membership.role), status: to_string(membership.status)}
        })

      {:error, _} ->
        {:error, :forbidden}
    end
  end

  @spec leave(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def leave(conn, _params) do
    scope = conn.assigns.current_scope

    case SubMaps.leave(scope, conn.assigns.sub_map) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, _} ->
        {:error, :forbidden}
    end
  end

  @spec approve_pin(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def approve_pin(conn, %{"id" => id}) do
    scope = conn.assigns.current_scope
    sub_map = conn.assigns.sub_map

    case SubMaps.approve_pin(scope, sub_map, id) do
      {:ok, pin} ->
        PinBroadcast.broadcast_pin_event(pin, :updated)

        conn
        |> put_view(json: PinJSON)
        |> render(:show, pin: pin, current_user: scope.user, sub_map: sub_map)

      other ->
        other
    end
  end

  @spec reject_pin(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reject_pin(conn, %{"id" => id}) do
    scope = conn.assigns.current_scope
    sub_map = conn.assigns.sub_map

    case SubMaps.reject_pin(scope, sub_map, id) do
      {:ok, pin} ->
        PinBroadcast.broadcast_pin_event(pin, :updated)

        conn
        |> put_view(json: PinJSON)
        |> render(:show, pin: pin, current_user: scope.user, sub_map: sub_map)

      other ->
        other
    end
  end

  defp render_show(conn, sub_map \\ nil) do
    sub_map = sub_map || conn.assigns.sub_map

    render(conn, :show,
      sub_map: sub_map,
      current_user: ConnAuth.current_user(conn),
      membership: conn.assigns.sub_map_membership,
      can_moderate: conn.assigns.can_moderate_sub_map,
      counts: SubMaps.counts(sub_map)
    )
  end
end
