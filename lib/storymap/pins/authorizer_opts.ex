defmodule Storymap.Pins.AuthorizerOpts do
  @moduledoc """
  Shared `[sub_map:, membership:]` opts for pin authorize_show / can_edit helpers.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin
  alias Storymap.SubMaps

  @spec for_pin(User.t() | nil, Pin.t()) :: keyword()
  def for_pin(user, %Pin{} = pin) do
    sub_map = pin.sub_map

    membership =
      if sub_map && user,
        do: SubMaps.get_membership(sub_map.id, user.id),
        else: nil

    [sub_map: sub_map, membership: membership]
  end
end
