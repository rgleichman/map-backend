defmodule StorymapWeb.PinTypeLive.NewTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  alias Storymap.PinTypes

  setup :register_and_log_in_user

  test "icon picker includes plant glyphs", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/pin-types/new")

    assert has_element?(view, "#pin-type-icon-picker")
    assert has_element?(view, "#pin-type-icon-grapes")
    assert has_element?(view, "#pin-type-icon-star input[checked]")
  end

  test "saves a plant icon", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/pin-types/new")
    label = "Grape Arbor #{System.unique_integer([:positive])}"

    assert {:error, {:live_redirect, %{to: to}}} =
             view
             |> form("#pin-type-form", %{
               "pin_type" => %{
                 "label" => label,
                 "icon" => "grapes",
                 "time_mode" => "none"
               }
             })
             |> render_submit()

    assert to =~ ~r"/pin-types/\d+/edit"

    pin_type = Enum.find(PinTypes.list_all_pin_types(), &(&1.label == label))
    assert pin_type.icon == "grapes"
  end
end
