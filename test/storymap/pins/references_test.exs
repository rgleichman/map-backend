defmodule Storymap.Pins.ReferencesTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.Pins
  alias Storymap.Pins.PinReference
  alias Storymap.Pins.References
  alias Storymap.Repo

  test "sync persists explicit linked_pin_ids" do
    user = user_fixture()
    target = pin_fixture(%{"title" => "Target"}, user)
    source = pin_fixture(%{"title" => "Source"}, user)

    assert {:ok, ^source} = References.sync(source, %{"linked_pin_ids" => [target.id]})

    assert [%PinReference{target_pin_id: target_id, kind: :explicit}] =
             Repo.all(from(r in PinReference, where: r.source_pin_id == ^source.id))

    assert target_id == target.id
  end

  test "sync returns changeset error for unavailable target instead of raising" do
    user = user_fixture()
    source = pin_fixture(%{}, user)

    assert {:error, %Ecto.Changeset{} = changeset} =
             References.sync(source, %{"linked_pin_ids" => [9_999_999_999]})

    assert "invalid or unavailable pin link" in errors_on(changeset).linked_pin_ids
  end

  test "sync collapses overlapping text refs to one row without raising" do
    user = user_fixture()
    target = pin_fixture(%{"title" => "Shared target"}, user)

    pin_type =
      simple_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "notes", "type" => "text", "label" => "Notes"}
          ]
        }
      })

    origin = Storymap.Pins.ReferenceParser.default_origin()
    link = "#{origin}/map?pin=#{target.id}"

    source =
      pin_fixture(
        %{
          "title" => "Source",
          "pin_type_id" => pin_type.id,
          "description" => "See #{link}",
          "custom_data" => %{"notes" => "Also #{link}"}
        },
        user
      )

    assert {:ok, ^source} = References.sync(source, %{"linked_pin_ids" => []})

    refs = Repo.all(from(r in PinReference, where: r.source_pin_id == ^source.id))
    assert length(refs) == 1
    assert hd(refs).target_pin_id == target.id
    assert hd(refs).kind == :text
  end

  test "Pins.update_pin propagates References.sync changeset errors" do
    user = user_fixture()
    source = pin_fixture(%{"title" => "Source"}, user)

    assert {:error, %Ecto.Changeset{} = changeset} =
             Pins.update_pin(source, %{
               "title" => source.title,
               "linked_pin_ids" => [source.id]
             })

    assert errors_on(changeset).linked_pin_ids != []
  end
end
