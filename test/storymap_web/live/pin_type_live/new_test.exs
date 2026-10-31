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
    assert has_element?(view, "#pin-type-icon-preview")
    assert has_element?(view, "span", "Icon color")
    assert has_element?(view, "span", "Icon background")
    refute has_element?(view, "span", "Marker color")
    assert has_element?(view, "#pin_type_marker_color[type=text]")
    assert has_element?(view, "#pin_type_icon_background_color[type=text]")
    assert has_element?(view, "#pin_type_marker_color-swatch[type=color]")
    assert has_element?(view, "#pin_type_icon_background_color-swatch[type=color]")
    assert has_element?(view, ~s(#pin_type_marker_color[placeholder="#a855f7"]))
    assert has_element?(view, ~s(#pin_type_icon_background_color[placeholder="#000000"]))
    refute has_element?(view, ~s(#pin_type_marker_color[value="#6366f1"]))
    refute has_element?(view, ~s(#pin_type_marker_color[value="#a855f7"]))
    assert has_element?(view, "#pin-type-icon-preview[style*='color: #a855f7']")
  end

  test "hex fields accept typed colors on validate", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/pin-types/new")

    html =
      view
      |> form("#pin-type-form", %{
        "pin_type" => %{
          "marker_color" => "#aabbcc",
          "icon_background_color" => "112233"
        }
      })
      |> render_change()

    assert html =~ ~s(id="pin_type_marker_color")
    assert html =~ ~s(value="#aabbcc")
    assert html =~ ~s(value="#112233")
  end

  test "saving without colors leaves them nil", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/pin-types/new")
    label = "Unset Colors #{System.unique_integer([:positive])}"

    assert {:error, {:live_redirect, %{to: to}}} =
             view
             |> form("#pin-type-form", %{
               "pin_type" => %{
                 "label" => label,
                 "icon" => "star",
                 "time_mode" => "none"
               }
             })
             |> render_submit()

    assert to =~ ~r"/pin-types/\d+/edit"

    pin_type = Enum.find(PinTypes.list_all_pin_types(), &(&1.label == label))
    assert pin_type.marker_color == nil
    assert pin_type.icon_background_color == nil
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
                 "marker_color" => "#fef08a",
                 "icon_background_color" => "#1e3a8a",
                 "time_mode" => "none"
               }
             })
             |> render_submit()

    assert to =~ ~r"/pin-types/\d+/edit"

    pin_type = Enum.find(PinTypes.list_all_pin_types(), &(&1.label == label))
    assert pin_type.icon == "grapes"
    assert pin_type.marker_color == "#fef08a"
    assert pin_type.icon_background_color == "#1e3a8a"
  end
end
