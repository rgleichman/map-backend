defmodule Storymap.Trust.WorldPendingTest do
  use Storymap.DataCase, async: false

  alias Storymap.Accounts.Scope
  alias Storymap.Pins
  alias Storymap.SubMaps
  alias Storymap.Trust
  alias Storymap.Trust.TrustEvent

  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures
  import Storymap.TrustFixtures

  setup do
    previous = Application.get_env(:storymap, Storymap.Trust, [])

    on_exit(fn ->
      Application.put_env(:storymap, Storymap.Trust, previous)
    end)

    :ok
  end

  test "gates off: world create stays approved" do
    Application.put_env(
      :storymap,
      Storymap.Trust,
      Keyword.put(Trust.config(), :trust_gates_enabled, false)
    )

    user = user_fixture()
    put_trust_score!(user.id, 0.0)

    {:ok, pin} =
      Pins.create_pin(
        %{
          "title" => "World",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        user.id
      )

    assert pin.status == :approved
  end

  test "gates on: low trust world create is pending; high trust is approved" do
    Application.put_env(
      :storymap,
      Storymap.Trust,
      Keyword.merge(Trust.config(), trust_gates_enabled: true, t_world: 0.55)
    )

    low = user_fixture()
    high = user_fixture()
    put_trust_score!(low.id, 0.1)
    put_trust_score!(high.id, 0.9)

    {:ok, pending} =
      Pins.create_pin(
        %{
          "title" => "Pending world",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        low.id
      )

    {:ok, approved} =
      Pins.create_pin(
        %{
          "title" => "Approved world",
          "latitude" => 31.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        high.id
      )

    assert pending.status == :pending
    assert approved.status == :approved
    refute pending.id in Enum.map(Pins.list_pins(), & &1.id)
  end

  test "trust-qualified non-mod can approve community pending when gates on" do
    Application.put_env(
      :storymap,
      Storymap.Trust,
      Keyword.merge(Trust.config(), trust_gates_enabled: true, t_approve: 0.70)
    )

    owner = user_fixture()
    contributor = user_fixture()
    trusted = user_fixture()
    put_trust_score!(trusted.id, 0.85)

    sub_map =
      sub_map_fixture(
        %{"contribution_mode" => "approval_required", "community_url" => "trust-approve"},
        owner
      )

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: contributor},
        sub_map,
        %{
          "title" => "Spot",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    assert pin.status == :pending

    assert {:ok, approved} = SubMaps.approve_pin(%Scope{user: trusted}, sub_map, pin.id)
    assert approved.status == :approved

    event = Repo.get_by(TrustEvent, type: :pin_approve, pin_id: pin.id, actor_user_id: trusted.id)
    assert event
    assert event.payload["gate"] == "trust"
  end

  test "world approve by admin emits ledger and publishes" do
    Application.put_env(
      :storymap,
      Storymap.Trust,
      Keyword.merge(Trust.config(), trust_gates_enabled: true, t_world: 0.55)
    )

    author = user_fixture()
    admin = user_fixture(%{admin_level: 1})
    put_trust_score!(author.id, 0.0)

    {:ok, pin} =
      Pins.create_pin(
        %{
          "title" => "Need review",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        author.id
      )

    assert pin.status == :pending
    assert {:ok, approved} = Pins.approve_world_pin(admin, pin.id)
    assert approved.status == :approved
    assert approved.id in Enum.map(Pins.list_pins(), & &1.id)
    assert Repo.get_by(TrustEvent, type: :pin_approve, pin_id: pin.id)
  end
end
