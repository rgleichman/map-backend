defmodule StorymapWeb.Plugs.RateLimitTest do
  use ExUnit.Case, async: false

  alias StorymapWeb.Plugs.RateLimit

  @table :storymap_rate_limit

  setup do
    RateLimit.purge_expired()
    :ok
  end

  describe "purge_expired/1" do
    test "removes 4-tuple rows after window end" do
      key = "purge-test-4-#{:erlang.unique_integer([:positive])}"
      :ets.insert(@table, {key, 2, 1000, 60})

      assert :ets.lookup(@table, key) != []
      assert RateLimit.purge_expired(1061) == 1
      assert :ets.lookup(@table, key) == []
    end

    test "keeps 4-tuple rows still inside the window" do
      key = "purge-test-active-#{:erlang.unique_integer([:positive])}"
      :ets.insert(@table, {key, 1, 1000, 60})

      assert RateLimit.purge_expired(1059) == 0
      assert :ets.lookup(@table, key) != []
    end

    test "removes legacy 3-tuple rows after conservative max window" do
      key = "purge-test-3-#{:erlang.unique_integer([:positive])}"
      :ets.insert(@table, {key, 1, 1000})

      assert RateLimit.purge_expired(1000 + 3600) == 0
      assert :ets.lookup(@table, key) != []

      assert RateLimit.purge_expired(1000 + 3601) == 1
      assert :ets.lookup(@table, key) == []
    end
  end

  describe "check (ETS shape)" do
    setup do
      mod = StorymapWeb.Plugs.RateLimit
      previous = Application.get_env(:storymap, mod, [])

      Application.put_env(:storymap, mod, Keyword.put(previous, :enabled, true))

      on_exit(fn ->
        Application.put_env(:storymap, mod, previous)
      end)

      :ok
    end

    test "writes {key, count, window_start, window_sec} for a new key" do
      suffix = "shape-test-#{:erlang.unique_integer([:positive])}"
      now = System.system_time(:second)
      ets_key = "contact_form:" <> suffix

      assert RateLimit.contact_form_check(suffix) == :allow

      assert [{^ets_key, 1, ws, 3600}] = :ets.lookup(@table, ets_key)
      assert ws >= now and ws <= now + 2
    end
  end
end
