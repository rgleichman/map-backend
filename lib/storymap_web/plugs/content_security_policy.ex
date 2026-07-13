defmodule StorymapWeb.Plugs.ContentSecurityPolicy do
  @moduledoc """
  Sets Content-Security-Policy and related secure browser headers.

  Production uses strict `script-src 'self'`; dev/test relax script rules for
  LiveReload and inline theme bootstrap when `csp_strict_scripts` is false.

  ## Adding external `connect-src` hosts

  `connect-src` is an allowlist (not a broad `https:` wildcard). When client JS
  starts calling a new origin (`fetch`, XHR, WebSocket, MapLibre tile loads,
  service worker fetches, etc.), add the origin to `@connect_hosts` below and
  extend `test/storymap_web/plugs/content_security_policy_test.exs`. Verify the
  feature in the browser — blocked requests show as CSP violations in devtools.

  Same-origin API calls use `'self'` and do not need to be listed.
  """
  import Phoenix.Controller, only: [put_secure_browser_headers: 2]

  @connect_hosts [
    "https://api.maptiler.com",
    "https://api.stadiamaps.com",
    "https://api-eu.stadiamaps.com"
  ]

  def init(opts), do: opts

  def call(conn, _opts) do
    put_secure_browser_headers(conn, %{"content-security-policy" => policy()})
  end

  @spec policy() :: String.t()
  def policy do
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "img-src 'self' data: https:",
      "media-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      script_src(),
      connect_src()
    ]
    |> Enum.join("; ")
  end

  defp connect_src do
    "connect-src 'self' " <> Enum.join(@connect_hosts, " ") <> " wss: ws:"
  end

  defp script_src do
    if strict_scripts?() do
      "script-src 'self'"
    else
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    end
  end

  defp strict_scripts? do
    Application.get_env(:storymap, :csp_strict_scripts, true)
  end
end
