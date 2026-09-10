defmodule StorymapWeb.RateLimitBeforeAuthTest do
  use StorymapWeb.ConnCase, async: false

  import Storymap.AccountsFixtures

  alias Storymap.Accounts.Scope
  alias StorymapWeb.Plugs.RateLimit

  @table :storymap_rate_limit

  setup do
    RateLimit.purge_expired()

    mod = RateLimit
    previous = Application.get_env(:storymap, mod, [])
    Application.put_env(:storymap, mod, Keyword.put(previous, :enabled, true))

    on_exit(fn ->
      Application.put_env(:storymap, mod, previous)
      RateLimit.purge_expired()
    end)

    conn =
      build_conn()
      |> put_req_header("accept", "application/json")

    {:ok, conn: conn}
  end

  test "unauthenticated API writes are rate limited by IP before auth rejection" do
    limit = 3
    rate_opts = RateLimit.init(bucket: "api_writes", limit: limit, window_sec: 60, format: :json)

    base =
      build_conn(:post, "/api/pins")
      |> put_req_header("accept", "application/json")
      |> Map.put(:remote_ip, {127, 0, 0, 1})
      |> assign(:current_scope, %Scope{user: nil})

    for _ <- 1..limit do
      conn = RateLimit.call(base, rate_opts)
      refute conn.halted
    end

    conn = RateLimit.call(base, rate_opts)

    assert conn.status == 429
    assert conn.halted
    assert conn.resp_body =~ "Too Many Requests"
  end

  test "authenticated API writes use a separate user bucket from IP" do
    user = user_fixture()
    Storymap.TrustFixtures.put_trust_score!(user.id, 0.1)
    limit = RateLimit.write_limit_for_user(user.id, 60)
    assert limit == 20

    rate_opts = RateLimit.init(bucket: "api_writes", limit: 60, window_sec: 60, format: :json)

    authed =
      build_conn(:post, "/api/pins")
      |> put_req_header("accept", "application/json")
      |> Map.put(:remote_ip, {127, 0, 0, 1})
      |> assign(:current_scope, %Scope{user: user})

    anon =
      build_conn(:post, "/api/pins")
      |> put_req_header("accept", "application/json")
      |> Map.put(:remote_ip, {127, 0, 0, 1})
      |> assign(:current_scope, %Scope{user: nil})

    for _ <- 1..limit do
      conn = RateLimit.call(authed, rate_opts)
      refute conn.halted
    end

    assert RateLimit.call(authed, rate_opts).status == 429

    conn = RateLimit.call(anon, rate_opts)
    refute conn.halted
  end

  test "api_writes trust bands: mid and high" do
    mid_user = user_fixture()
    high_user = user_fixture()
    Storymap.TrustFixtures.put_trust_score!(mid_user.id, 0.45)
    Storymap.TrustFixtures.put_trust_score!(high_user.id, 0.80)

    assert RateLimit.write_limit_for_user(mid_user.id, 60) == 60
    assert RateLimit.write_limit_for_user(high_user.id, 60) == 120
    # missing score → mid default
    assert RateLimit.write_limit_for_user(user_fixture().id, 60) == 60
  end

  test "API write route returns 429 before auth when IP bucket is exhausted", %{conn: conn} do
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    now = System.system_time(:second)
    :ets.insert(@table, {"rate_limit:api_writes:ip:#{ip}", 60, now, 60})

    conn =
      post(conn, ~p"/api/pins", pin: %{title: "x", latitude: 1, longitude: 1, pin_type: "other"})

    assert json_response(conn, 429)
  end

  test "api read and write buckets are independent for the same IP", %{conn: conn} do
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    now = System.system_time(:second)

    :ets.insert(@table, {"rate_limit:api_reads:ip:#{ip}", 300, now, 60})

    conn =
      post(conn, ~p"/api/pins", pin: %{title: "x", latitude: 1, longitude: 1, pin_type: "other"})

    assert conn.status != 429
  end
end
