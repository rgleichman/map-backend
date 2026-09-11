defmodule Storymap.Pins.ListPinsTrustTest do
  use Storymap.DataCase, async: false

  alias Storymap.Pins
  alias Storymap.Trust

  import Storymap.AccountsFixtures
  import Storymap.TrustFixtures

  setup do
    previous = Application.get_env(:storymap, Storymap.Trust, [])

    on_exit(fn ->
      Application.put_env(:storymap, Storymap.Trust, previous)
    end)

    Application.put_env(
      :storymap,
      Storymap.Trust,
      Keyword.merge(Trust.config(), trust_gates_enabled: true, t_world: 0.55)
    )

    :ok
  end

  test "list_pins/1 includes the viewer's pending world pin but not others'" do
    author = user_fixture()
    other = user_fixture()
    put_trust_score!(author.id, 0.0)
    put_trust_score!(other.id, 0.0)

    {:ok, mine} =
      Pins.create_pin(
        %{
          "title" => "Mine pending",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        author.id
      )

    {:ok, theirs} =
      Pins.create_pin(
        %{
          "title" => "Theirs pending",
          "latitude" => 31.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        other.id
      )

    ids = Enum.map(Pins.list_pins(author), & &1.id)
    assert mine.id in ids
    refute theirs.id in ids
    refute mine.id in Enum.map(Pins.list_pins(), & &1.id)
  end

  test "list_pins/1 includes all pending world pins for trust approvers" do
    author = user_fixture()
    approver = user_fixture(%{admin_level: 1})
    put_trust_score!(author.id, 0.0)

    {:ok, pending} =
      Pins.create_pin(
        %{
          "title" => "Needs review",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        },
        author.id
      )

    assert pending.status == :pending
    assert pending.id in Enum.map(Pins.list_pins(approver), & &1.id)
  end
end
