defmodule StorymapWeb.FallbackControllerTest do
  use StorymapWeb.ConnCase, async: true

  alias Storymap.Tags.Tag
  alias StorymapWeb.FallbackController

  setup %{conn: conn} do
    conn =
      conn
      |> put_req_header("accept", "application/json")
      |> Map.put(:private, Map.put(conn.private, :phoenix_format, "json"))

    {:ok, conn: conn}
  end

  test "renders changeset errors as 422 JSON", %{conn: conn} do
    changeset = Tag.changeset(%Tag{}, %{})

    conn = FallbackController.call(conn, {:error, changeset})

    body = json_response(conn, 422)
    assert body["errors"]["name"]
  end

  test "renders not_found as 404 JSON", %{conn: conn} do
    conn = FallbackController.call(conn, {:error, :not_found})
    assert json_response(conn, 404)["errors"]["detail"] == "Not Found"
  end

  test "renders invalid_subject as 422 JSON", %{conn: conn} do
    conn = FallbackController.call(conn, {:error, :invalid_subject})

    assert json_response(conn, 422)["errors"] == %{
             "subject" => "Invalid subject_type or subject_id"
           }
  end

  test "renders forbidden as 403 JSON", %{conn: conn} do
    conn = FallbackController.call(conn, {:error, :forbidden})
    assert json_response(conn, 403)["errors"]["detail"] == "Forbidden"
  end

  test "renders unauthorized as 401 JSON", %{conn: conn} do
    conn = FallbackController.call(conn, {:error, :unauthorized})
    assert json_response(conn, 401)["errors"]["detail"] == "Unauthorized"
  end

  test "renders in_use as 422 JSON", %{conn: conn} do
    conn = FallbackController.call(conn, {:error, :in_use})
    assert json_response(conn, 422)["errors"]["detail"] == "Unprocessable Content"
  end
end
