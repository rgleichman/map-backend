defmodule Storymap.TestPinTypes do
  @moduledoc false

  alias Storymap.PinTypes.PinType
  alias Storymap.Repo
  alias Storymap.SubMaps.PinTypeSettings

  @system_types [
    %{
      slug: "one_time",
      label: "One-time event",
      time_mode: :one_time,
      allow_open_24_7: false
    },
    %{
      slug: "scheduled",
      label: "Scheduled recurring",
      time_mode: :hours,
      allow_open_24_7: false
    },
    %{
      slug: "food_bank",
      label: "Food bank",
      time_mode: :hours,
      allow_open_24_7: true
    },
    %{
      slug: "other",
      label: "Other",
      time_mode: :none,
      allow_open_24_7: false
    }
  ]

  @doc """
  Ensures the four system catalog rows exist (idempotent).

  The unify migration seeds these in real databases; tests call this so suites
  stay green even when starting from an empty catalog.
  """
  @spec ensure_system_types!() :: :ok
  def ensure_system_types! do
    Enum.each(@system_types, fn attrs ->
      case Repo.get_by(PinType, slug: attrs.slug) do
        %PinType{} ->
          :ok

        nil ->
          %PinType{}
          |> Ecto.Changeset.change(%{
            slug: attrs.slug,
            label: attrs.label,
            schema: %{"fields" => []},
            time_mode: attrs.time_mode,
            allow_open_24_7: attrs.allow_open_24_7,
            is_system: true,
            enabled: true
          })
          |> Repo.insert!()
      end
    end)

    :ok
  end

  @doc """
  Enables every currently enabled catalog type on the sub-map (including system seeds).
  """
  @spec enable_all_types!(Storymap.SubMaps.SubMap.t()) :: :ok
  def enable_all_types!(sub_map) do
    ids = Storymap.PinTypes.list_enabled_pin_types() |> Enum.map(& &1.id)
    PinTypeSettings.replace_enabled_pin_types(sub_map, ids)
  end
end
