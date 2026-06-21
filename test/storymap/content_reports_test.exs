defmodule Storymap.ContentReportsTest do
  use Storymap.DataCase, async: true

  import Ecto.Query

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.AdminActivity.Event
  alias Storymap.ContentReports
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Repo

  defp admin_scope do
    user = user_fixture() |> then(&Repo.update!(Ecto.Changeset.change(&1, admin_level: 10)))
    Storymap.Accounts.Scope.for_user(user)
  end

  test "create_report inserts report and admin activity event" do
    pin = pin_fixture(%{"latitude" => 45.52, "longitude" => -122.67, "title" => "Reportable pin"})
    reporter = user_fixture()

    assert {:ok, %ContentReport{} = report} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin",
                 "subject_id" => pin.id,
                 "category" => "inaccurate",
                 "details" => "wrong hours"
               },
               reporter.id
             )

    assert report.category == :inaccurate
    assert report.subject_label == "Reportable pin"
    assert report.reporter_user_id == reporter.id
    assert report.resolved_at == nil

    event =
      Repo.one!(
        from(e in Event,
          where: e.type == "content_reported",
          order_by: [desc: e.id],
          limit: 1
        )
      )

    assert event.metadata["report_id"] == report.id
    assert event.metadata["pin_id"] == pin.id
  end

  test "create_report returns not_found for missing pin" do
    assert {:error, :not_found} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin",
                 "subject_id" => 9_999_999_999,
                 "category" => "spam"
               },
               nil
             )
  end

  test "resolve and unresolve update unresolved_count" do
    scope = admin_scope()
    pin = pin_fixture(%{"latitude" => 40.0, "longitude" => -74.0})

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert ContentReports.unresolved_count(scope) == 1

    assert {:ok, %ContentReport{resolved_at: %DateTime{}}} =
             ContentReports.resolve_report(scope, report.id)

    assert ContentReports.unresolved_count(scope) == 0

    assert {:ok, %ContentReport{resolved_at: nil}} =
             ContentReports.unresolve_report(scope, report.id)

    assert ContentReports.unresolved_count(scope) == 1
  end
end
