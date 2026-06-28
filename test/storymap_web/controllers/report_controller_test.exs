defmodule StorymapWeb.ReportControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.PinsFixtures

  @report_attrs %{
    subject_type: "pin",
    subject_id: nil,
    category: "inaccurate",
    details: "test details"
  }

  describe "create anonymous" do
    setup %{conn: conn} do
      pin = pin_fixture(%{"latitude" => 41.88, "longitude" => -87.63})
      {:ok, conn: put_req_header(conn, "accept", "application/json"), pin: pin}
    end

    test "creates report without login", %{conn: conn, pin: pin} do
      attrs = Map.put(@report_attrs, :subject_id, pin.id)
      conn = post(conn, ~p"/api/reports", report: attrs)
      assert %{"id" => id} = json_response(conn, 201)["data"]

      report = Storymap.Repo.get!(Storymap.ContentReports.ContentReport, id)
      assert report.reporter_user_id == nil
    end
  end

  describe "create authenticated" do
    setup %{conn: conn} do
      pin = pin_fixture(%{"latitude" => 41.88, "longitude" => -87.63})
      {:ok, conn: put_req_header(conn, "accept", "application/json"), pin: pin}
    end

    setup :register_and_log_in_user

    test "creates report when pin exists", %{conn: conn, pin: pin, user: user} do
      attrs = Map.put(@report_attrs, :subject_id, pin.id)
      conn = post(conn, ~p"/api/reports", report: attrs)
      assert %{"id" => id, "category" => "inaccurate"} = json_response(conn, 201)["data"]
      assert is_integer(id)

      report = Storymap.Repo.get!(Storymap.ContentReports.ContentReport, id)
      assert report.reporter_user_id == user.id
      assert report.category == :inaccurate
    end

    test "returns 404 when pin missing", %{conn: conn} do
      attrs = Map.put(@report_attrs, :subject_id, 99_999_999)
      conn = post(conn, ~p"/api/reports", report: attrs)
      assert json_response(conn, 404)
    end

    test "creates report for pin_comment", %{conn: conn, pin: pin} do
      comment = pin_comment_fixture(%{"body" => "Bad comment"}, pin)

      attrs =
        @report_attrs
        |> Map.put(:subject_type, "pin_comment")
        |> Map.put(:subject_id, comment.id)
        |> Map.put(:category, "spam")

      conn = post(conn, ~p"/api/reports", report: attrs)
      assert %{"id" => id, "category" => "spam"} = json_response(conn, 201)["data"]
      assert is_integer(id)

      report = Storymap.Repo.get!(Storymap.ContentReports.ContentReport, id)
      assert report.subject_type == "pin_comment"
      assert report.subject_id == comment.id
    end

    test "returns 404 when pin_comment missing", %{conn: conn} do
      attrs =
        @report_attrs
        |> Map.put(:subject_type, "pin_comment")
        |> Map.put(:subject_id, 99_999_999)

      conn = post(conn, ~p"/api/reports", report: attrs)
      assert json_response(conn, 404)
    end

    test "returns 422 for invalid category", %{conn: conn, pin: pin} do
      attrs =
        @report_attrs
        |> Map.put(:subject_id, pin.id)
        |> Map.put(:category, "nope")

      conn = post(conn, ~p"/api/reports", report: attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end

    test "returns 422 for invalid subject_type", %{conn: conn, pin: pin} do
      attrs = Map.put(@report_attrs, :subject_id, pin.id) |> Map.put(:subject_type, "user")
      conn = post(conn, ~p"/api/reports", report: attrs)

      assert json_response(conn, 422)["errors"] == %{
               "subject" => "Invalid subject_type or subject_id"
             }
    end

    test "returns 422 for invalid subject_id", %{conn: conn} do
      attrs = Map.put(@report_attrs, :subject_id, "not-a-number")
      conn = post(conn, ~p"/api/reports", report: attrs)

      assert json_response(conn, 422)["errors"] == %{
               "subject" => "Invalid subject_type or subject_id"
             }
    end
  end

  describe "create without report param" do
    setup %{conn: conn} do
      {:ok, conn: put_req_header(conn, "accept", "application/json")}
    end

    test "returns 422 when report param is missing", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", %{})
      assert json_response(conn, 422)["errors"]["detail"] == "Unprocessable Content"
    end
  end
end
