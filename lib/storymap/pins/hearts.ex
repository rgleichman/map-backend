defmodule Storymap.Pins.Hearts do
  @moduledoc """
  Per-user saved (hearted) pins.
  """
  import Ecto.Query

  alias Storymap.Accounts.User
  alias Storymap.Pins.{Authorizer, Pin, PinHeart, Query}
  alias Storymap.Repo
  alias Storymap.SubMaps
  alias Storymap.Types

  @spec heart(User.t(), Pin.t()) :: Types.ecto_result(PinHeart.t())
  def heart(%User{id: user_id}, %Pin{id: pin_id}) do
    case Repo.get_by(PinHeart, user_id: user_id, pin_id: pin_id) do
      %PinHeart{} = heart ->
        {:ok, heart}

      nil ->
        %PinHeart{}
        |> PinHeart.changeset(%{user_id: user_id, pin_id: pin_id})
        |> Repo.insert()
    end
  end

  @spec unheart(User.t(), Pin.t()) :: :ok
  def unheart(%User{id: user_id}, %Pin{id: pin_id}) do
    from(h in PinHeart, where: h.user_id == ^user_id and h.pin_id == ^pin_id)
    |> Repo.delete_all()

    :ok
  end

  @spec hearted?(User.t(), Pin.t()) :: boolean()
  def hearted?(%User{id: user_id}, %Pin{id: pin_id}) do
    Repo.exists?(from h in PinHeart, where: h.user_id == ^user_id and h.pin_id == ^pin_id)
  end

  @spec list_pin_ids(User.t(), keyword()) :: [integer()]
  def list_pin_ids(%User{} = viewer, opts \\ []) do
    viewer
    |> list_pins(opts)
    |> Enum.map(& &1.id)
  end

  @spec list_pins(User.t(), keyword()) :: [Pin.t()]
  def list_pins(%User{} = viewer, opts \\ []) do
    user_id =
      case Keyword.fetch(opts, :for_user_id) do
        {:ok, id} when id != viewer.id ->
          raise ArgumentError,
                "Hearts.list_pins/2 does not allow :for_user_id other than viewer.id"

        _ ->
          viewer.id
      end

    limit = Keyword.get(opts, :limit)

    hearts =
      from(h in PinHeart,
        where: h.user_id == ^user_id,
        order_by: [desc: h.inserted_at],
        preload: [pin: ^Query.base()]
      )
      |> Repo.all()

    pins =
      hearts
      |> Enum.map(& &1.pin)
      |> Enum.filter(&visible_to_viewer?(viewer, &1))

    if limit, do: Enum.take(pins, limit), else: pins
  end

  @spec count_pins(User.t()) :: non_neg_integer()
  def count_pins(%User{} = viewer) do
    viewer |> list_pins() |> length()
  end

  defp visible_to_viewer?(%User{} = viewer, %Pin{} = pin) do
    sub_map = pin.sub_map

    membership =
      if sub_map,
        do: SubMaps.get_membership(sub_map.id, viewer.id),
        else: nil

    Authorizer.authorize_show(viewer, pin, sub_map: sub_map, membership: membership) == :ok
  end
end
