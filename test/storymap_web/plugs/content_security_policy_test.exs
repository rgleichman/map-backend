defmodule StorymapWeb.Plugs.ContentSecurityPolicyTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.Plugs.ContentSecurityPolicy

  test "policy includes core directives" do
    policy = ContentSecurityPolicy.policy()

    assert policy =~ "default-src 'self'"
    assert policy =~ "base-uri 'self'"
    assert policy =~ "connect-src 'self' https://api.maptiler.com https://api.stadiamaps.com"
    assert policy =~ "https://api-eu.stadiamaps.com"
    assert policy =~ "wss: ws:"
    refute policy =~ "connect-src 'self' https: wss:"
  end

  test "strict script-src when csp_strict_scripts is true" do
    previous = Application.get_env(:storymap, :csp_strict_scripts)

    on_exit(fn ->
      if previous == nil do
        Application.delete_env(:storymap, :csp_strict_scripts)
      else
        Application.put_env(:storymap, :csp_strict_scripts, previous)
      end
    end)

    Application.put_env(:storymap, :csp_strict_scripts, true)
    policy = ContentSecurityPolicy.policy()
    assert policy =~ "script-src 'self'"
    refute policy =~ "script-src 'self' 'unsafe-inline'"
  end
end
