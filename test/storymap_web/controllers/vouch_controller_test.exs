defmodule StorymapWeb.VouchControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.TrustFixtures

  test "POST /api/users/:id/vouch creates vouch", %{conn: conn} do
    actor = user_fixture()
    subject = user_fixture()
    put_trust_score!(actor.id, 0.8)

    conn = log_in_user(conn, actor)
    conn = post(conn, ~p"/api/users/#{subject.id}/vouch")

    assert %{"data" => %{"subject_user_id" => sid, "vouch_budget_remaining" => 4}} =
             json_response(conn, 201)

    assert sid == subject.id
  end

  test "POST vouch forbidden below threshold", %{conn: conn} do
    actor = user_fixture()
    subject = user_fixture()
    put_trust_score!(actor.id, 0.1)

    conn = log_in_user(conn, actor)
    conn = post(conn, ~p"/api/users/#{subject.id}/vouch")
    assert json_response(conn, 403)
  end

  test "DELETE /api/users/:id/vouch revokes", %{conn: conn} do
    actor = user_fixture()
    subject = user_fixture()
    put_trust_score!(actor.id, 0.8)

    conn = log_in_user(conn, actor)
    assert json_response(post(conn, ~p"/api/users/#{subject.id}/vouch"), 201)

    conn = delete(conn, ~p"/api/users/#{subject.id}/vouch")
    assert %{"data" => %{"vouch_budget_remaining" => 5}} = json_response(conn, 200)
  end
end
