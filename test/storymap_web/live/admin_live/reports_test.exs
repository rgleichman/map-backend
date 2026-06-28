defmodule StorymapWeb.AdminLive.ReportsTest do
  use StorymapWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.ContentReports
  alias Storymap.Repo

  test "pin_comment report card shows comment badge and view pin link", %{conn: conn} do
    admin = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
    pin = pin_fixture(%{"latitude" => 47.6, "longitude" => -122.33, "title" => "Commented venue"})
    comment = pin_comment_fixture(%{"body" => "Spam text"}, pin)

    {:ok, report} =
      ContentReports.create_report(
        %{
          "subject_type" => "pin_comment",
          "subject_id" => comment.id,
          "category" => "spam"
        },
        nil
      )

    conn = log_in_user(conn, admin)
    {:ok, view, html} = live(conn, ~p"/admin/reports")

    row = "#reports-#{report.id}"
    assert has_element?(view, row)
    assert html =~ "Comment ##{comment.id}"
    assert html =~ "Spam text"
    assert html =~ "View pin"
    assert html =~ "Pin #{pin.id}"
  end

  test "mark resolved toggles row and unresolved badge text", %{conn: conn} do
    admin = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
    pin = pin_fixture(%{"latitude" => 47.6, "longitude" => -122.33, "title" => "Reported venue"})

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "spam"},
        nil
      )

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/reports")

    row = "#reports-#{report.id}"
    assert has_element?(view, row)
    assert has_element?(view, row <> " button", "Mark resolved")

    view
    |> element(row <> " button", "Mark resolved")
    |> render_click()

    assert has_element?(view, row <> " button", "Mark unresolved")
    assert render(view) =~ "Unresolved: 0"

    view
    |> element(row <> " button", "Mark unresolved")
    |> render_click()

    assert has_element?(view, row <> " button", "Mark resolved")
  end

  test "mark all resolved clears unresolved count in header", %{conn: conn} do
    admin = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
    pin = pin_fixture(%{"latitude" => 48.0, "longitude" => -122.0})

    {:ok, r1} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    {:ok, _r2} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    conn = log_in_user(conn, admin)
    {:ok, view, _html} = live(conn, ~p"/admin/reports")

    assert render(view) =~ "Unresolved: 2"

    view
    |> element("#admin-reports-mark-all-resolved")
    |> render_click()

    assert render(view) =~ "Unresolved: 0"
    assert has_element?(view, "#reports-#{r1.id} button", "Mark unresolved")
  end

  test "non-admin cannot access reports LiveView", %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)
    assert {:error, {:redirect, %{to: "/"}}} = live(conn, ~p"/admin/reports")
  end
end
