defmodule StorymapWeb.PinFieldBlobController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.{Authorizer, AuthorizerOpts}
  alias StorymapWeb.ConnAuth

  action_fallback StorymapWeb.FallbackController

  defp blob_type(conn) do
    conn.private[:blob_type] || conn.params["blob_type"]
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id, "field_key" => field_key}) do
    type = blob_type(conn)
    user = ConnAuth.current_user(conn)

    with {pin_id, ""} <- Integer.parse(id),
         pin when not is_nil(pin) <- Pins.get_pin(pin_id) do
      opts = AuthorizerOpts.for_pin(user, pin)

      with :ok <- Authorizer.authorize_show(user, pin, opts) do
        case Pins.get_field_blob(pin.id, field_key, type) do
          nil ->
            {:error, :not_found}

          blob ->
            render(conn, :show, blob: blob)
        end
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"id" => id, "field_key" => field_key} = params) do
    type = blob_type(conn)
    current_user = conn.assigns.current_scope.user

    with {pin_id, ""} <- Integer.parse(id),
         pin when not is_nil(pin) <- Pins.get_pin(pin_id) do
      opts = Keyword.put(AuthorizerOpts.for_pin(current_user, pin), :user, current_user)

      with :ok <- Authorizer.authorize_update(current_user, pin, opts),
           {:ok, %{pin: pin}} <-
             Pins.upsert_field_blob(pin, field_key, type, field_blob_params(params)) do
        pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

        conn
        |> put_view(StorymapWeb.PinJSON)
        |> render(:show,
          pin: pin,
          current_user: current_user,
          sub_map: opts[:sub_map],
          membership: opts[:membership]
        )
      else
        {:error, :invalid_blob_field} ->
          invalid_blob_field(conn, type)

        other ->
          other
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params), do: create(conn, params)

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id, "field_key" => field_key}) do
    type = blob_type(conn)
    current_user = conn.assigns.current_scope.user

    with {pin_id, ""} <- Integer.parse(id),
         pin when not is_nil(pin) <- Pins.get_pin(pin_id) do
      opts = Keyword.put(AuthorizerOpts.for_pin(current_user, pin), :user, current_user)

      with :ok <- Authorizer.authorize_update(current_user, pin, opts),
           {:ok, pin} <- Pins.delete_field_blob(pin, field_key, type) do
        pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

        conn
        |> put_view(StorymapWeb.PinJSON)
        |> render(:show,
          pin: pin,
          current_user: current_user,
          sub_map: opts[:sub_map],
          membership: opts[:membership]
        )
      else
        {:error, :invalid_blob_field} ->
          invalid_blob_field(conn, type)

        {:error, :required_blob_field} ->
          required_blob_field(conn)

        other ->
          other
      end
    else
      _ -> {:error, :not_found}
    end
  end

  defp field_blob_params(%{"field_blob" => %{} = params}), do: params

  defp field_blob_params(%{"music_field" => %{} = params}), do: params

  defp field_blob_params(%{"payload" => _} = params),
    do: Map.take(params, ["payload", "format", "version"])

  defp field_blob_params(%{payload: _} = params),
    do: Map.take(params, [:payload, :format, :version])

  defp field_blob_params(_), do: %{}

  defp invalid_blob_field(conn, blob_type) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      errors: %{
        field_key: ["is not a #{to_string(blob_type)} field for this pin type"]
      }
    })
  end

  defp required_blob_field(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{field_key: ["cannot delete required field"]}})
  end
end
