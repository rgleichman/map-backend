defmodule Storymap.Pins.PinDiffTest do
  use Storymap.DataCase, async: true

  alias Storymap.AccountsFixtures
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinDiff
  alias Storymap.Repo
  alias Storymap.Tags.Tag

  @pin_base %Pin{
    title: "t",
    latitude: 1.0,
    longitude: 2.0,
    pin_type: "one_time",
    description: nil,
    icon_url: nil,
    start_time: nil,
    end_time: nil,
    schedule_rrule: nil,
    schedule_timezone: nil,
    tags: []
  }

  test "includes scalar field changes" do
    before = @pin_base
    after_pin = %{before | title: "new title", latitude: 9.0}

    diff = PinDiff.diff(before, after_pin)["changes"]

    assert diff["title"] == %{"from" => "t", "to" => "new title"}
    assert diff["latitude"] == %{"from" => 1.0, "to" => 9.0}
    refute Map.has_key?(diff, "longitude")
  end

  test "includes tags when both sides are loaded and differ" do
    before = %{@pin_base | tags: [%Tag{name: "alpha"}]}
    after_pin = %{@pin_base | tags: [%Tag{name: "beta"}]}

    diff = PinDiff.diff(before, after_pin)["changes"]

    assert diff["tags"] == %{"from" => ["alpha"], "to" => ["beta"]}
  end

  test "does not add a tags diff when before pin tags are not loaded" do
    user = AccountsFixtures.user_fixture()

    pin =
      Storymap.PinsFixtures.pin_fixture(
        %{"title" => "Tagged pin", "tags" => ["alpha", "beta"]},
        user
      )

    before_pin = Repo.get!(Pin, pin.id)
    assert %Ecto.Association.NotLoaded{} = before_pin.tags

    after_pin = Repo.preload(before_pin, :tags)
    assert is_list(after_pin.tags)

    diff = PinDiff.diff(before_pin, after_pin)

    refute Map.has_key?(diff["changes"], "tags")
  end
end
