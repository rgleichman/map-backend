defmodule Storymap.ContentReportsTest do
  use Storymap.DataCase, async: true

  import Ecto.Query

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  alias Storymap.AdminActivity.Event
  alias Storymap.ContentReports
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Pins.Comments
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

  test "create_report for pin_comment inserts report and activity metadata" do
    pin = pin_fixture(%{"latitude" => 45.52, "longitude" => -122.67, "title" => "Commented pin"})
    comment = pin_comment_fixture(%{"body" => "Offensive reply"}, pin)

    assert {:ok, %ContentReport{} = report} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin_comment",
                 "subject_id" => comment.id,
                 "category" => "abusive_or_hateful"
               },
               nil
             )

    assert report.subject_type == "pin_comment"
    assert report.subject_id == comment.id
    assert report.subject_label == "Comment on «Commented pin»"
    assert report.details == "Offensive reply"
    assert report.sub_map_id == pin.sub_map_id

    event =
      Repo.one!(
        from(e in Event,
          where: e.type == "content_reported",
          order_by: [desc: e.id],
          limit: 1
        )
      )

    assert event.metadata["report_id"] == report.id
    assert event.metadata["comment_id"] == comment.id
    assert event.metadata["comment_body"] == "Offensive reply"
    assert event.metadata["pin_id"] == pin.id
  end

  test "create_report for pin_comment merges reporter details with comment body" do
    pin = pin_fixture(%{"title" => "Venue"})
    comment = pin_comment_fixture(%{"body" => "Bad take"}, pin)

    assert {:ok, %ContentReport{} = report} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin_comment",
                 "subject_id" => comment.id,
                 "category" => "spam",
                 "details" => "Also misleading"
               },
               nil
             )

    assert report.details == "Bad take\n\n---\n\nAlso misleading"
  end

  test "create_report for pin_comment preserves reporter notes when comment body is long" do
    pin = pin_fixture(%{"title" => "Venue"})
    long_comment = String.duplicate("c", 2000)
    comment = pin_comment_fixture(%{"body" => long_comment}, pin)
    reporter_notes = String.duplicate("n", 200)

    assert {:ok, %ContentReport{} = report} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin_comment",
                 "subject_id" => comment.id,
                 "category" => "spam",
                 "details" => reporter_notes
               },
               nil
             )

    assert String.length(report.details) == 2000
    assert String.ends_with?(report.details, reporter_notes)
    assert report.details =~ "\n\n---\n\n"
    refute String.ends_with?(report.details, long_comment)
  end

  test "build_comment_report_details/2 preserves reporter notes and truncates comment" do
    comment = String.duplicate("a", 2000)
    notes = String.duplicate("b", 100)

    details = ContentReports.build_comment_report_details(comment, notes)

    assert String.length(details) == 2000
    assert String.ends_with?(details, notes)
    assert details =~ "\n\n---\n\n"
  end

  test "build_comment_report_details/2 returns full comment when no reporter notes" do
    comment = String.duplicate("z", 1500)
    assert ContentReports.build_comment_report_details(comment, nil) == comment
  end

  test "create_report returns not_found for missing or deleted comment" do
    pin = pin_fixture()
    comment = pin_comment_fixture(%{}, pin)
    {:ok, deleted} = Comments.delete_comment(comment)

    assert {:error, :not_found} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin_comment",
                 "subject_id" => 9_999_999_999,
                 "category" => "spam"
               },
               nil
             )

    assert {:error, :not_found} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin_comment",
                 "subject_id" => deleted.id,
                 "category" => "spam"
               },
               nil
             )
  end

  test "report_pin_id resolves pin from pin and pin_comment reports" do
    pin = pin_fixture(%{"title" => "Target pin"})
    comment = pin_comment_fixture(%{}, pin)

    {:ok, pin_report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    {:ok, comment_report} =
      ContentReports.create_report(
        %{"subject_type" => "pin_comment", "subject_id" => comment.id, "category" => "other"},
        nil
      )

    assert ContentReports.report_pin_id(pin_report) == pin.id
    assert ContentReports.report_pin_id(comment_report) == pin.id
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

  test "create_report returns invalid_subject for bad subject_type" do
    pin = pin_fixture()

    assert {:error, :invalid_subject} =
             ContentReports.create_report(
               %{
                 "subject_type" => "user",
                 "subject_id" => pin.id,
                 "category" => "spam"
               },
               nil
             )
  end

  test "create_report returns invalid_subject for malformed subject_id" do
    assert {:error, :invalid_subject} =
             ContentReports.create_report(
               %{
                 "subject_type" => "pin",
                 "subject_id" => "not-an-id",
                 "category" => "spam"
               },
               nil
             )
  end

  test "create_report returns invalid_subject when subject missing" do
    assert {:error, :invalid_subject} =
             ContentReports.create_report(%{"category" => "spam"}, nil)
  end

  test "list_reports_for_admin returns empty for non-admin" do
    user = user_fixture()
    scope = Storymap.Accounts.Scope.for_user(user)
    pin = pin_fixture()

    {:ok, _} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert ContentReports.list_reports_for_admin(scope) == []
    assert ContentReports.unresolved_count(scope) == 0
  end

  test "list_reports_for_admin returns reports for admin" do
    scope = admin_scope()
    pin = pin_fixture()

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert [listed] = ContentReports.list_reports_for_admin(scope)
    assert listed.id == report.id
  end

  test "resolve_report returns not_found for missing id" do
    scope = admin_scope()
    assert {:error, :not_found} = ContentReports.resolve_report(scope, 9_999_999_999)
  end

  test "resolve_report returns noop when already resolved" do
    scope = admin_scope()
    pin = pin_fixture()

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert {:ok, _} = ContentReports.resolve_report(scope, report.id)
    assert {:ok, :noop} = ContentReports.resolve_report(scope, report.id)
  end

  test "resolve_report unauthorized for non-admin" do
    user = user_fixture()
    scope = Storymap.Accounts.Scope.for_user(user)
    pin = pin_fixture()

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert {:error, :unauthorized} = ContentReports.resolve_report(scope, report.id)
  end

  test "unresolve_report returns not_found for missing id" do
    scope = admin_scope()
    assert {:error, :not_found} = ContentReports.unresolve_report(scope, 9_999_999_999)
  end

  test "unresolve_report returns noop when already unresolved" do
    scope = admin_scope()
    pin = pin_fixture()

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert {:ok, :noop} = ContentReports.unresolve_report(scope, report.id)
  end

  test "unresolve_report unauthorized for non-admin" do
    user = user_fixture()
    scope = Storymap.Accounts.Scope.for_user(user)
    pin = pin_fixture()

    {:ok, report} =
      ContentReports.create_report(
        %{"subject_type" => "pin", "subject_id" => pin.id, "category" => "other"},
        nil
      )

    assert {:error, :unauthorized} = ContentReports.unresolve_report(scope, report.id)
  end
end
