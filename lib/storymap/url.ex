defmodule Storymap.URL do
  @moduledoc false

  @domain_host ~r/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/
  @email ~r/[a-zA-Z0-9._%+-]+@#{Regex.source(@domain_host)}/
  @email_anchored Regex.compile!("^#{Regex.source(@email)}$")
  @mailto_href_re Regex.compile!(
                    "^mailto:#{Regex.source(@email)}(?:\\?[a-zA-Z0-9_\\-.*=&%+]*)?$",
                    [:caseless]
                  )

  @hostname_re ~r/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/
  @explicit_scheme_re ~r/^([a-zA-Z][a-zA-Z0-9+.-]*):/
  @ascii_scheme_re ~r/^[a-zA-Z][a-zA-Z0-9+.-]*:$/

  @max_mailto_len 2048

  def sanitize_link_input(url) when is_binary(url) do
    url |> String.trim() |> String.normalize(:nfkc)
  end

  def normalize_url(url) when is_binary(url) do
    url = sanitize_link_input(url)
    lower = String.downcase(url)

    cond do
      String.starts_with?(lower, "mailto:") -> url
      Regex.match?(~r/^https?:\/\//i, url) -> url
      Regex.match?(@email_anchored, url) -> "mailto:" <> url
      true -> "https://" <> url
    end
  end

  def safe_url?(url) when is_binary(url) do
    url = sanitize_link_input(url)
    if url == "", do: false, else: safe_url_normalized?(url)
  end

  def safe_url?(_), do: false

  defp safe_url_normalized?(url) do
    case explicit_scheme(url) do
      :invalid ->
        false

      "mailto" ->
        valid_mailto?(url)

      scheme when scheme in ["http", "https"] ->
        valid_web_url?(url)

      nil ->
        cond do
          Regex.match?(@email_anchored, url) -> true
          valid_web_url?(url) -> true
          true -> false
        end

      _ ->
        false
    end
  end

  defp explicit_scheme(url) do
    case Regex.run(@explicit_scheme_re, url) do
      [prefix, scheme] ->
        if Regex.match?(@ascii_scheme_re, prefix) do
          String.downcase(scheme)
        else
          :invalid
        end

      _ ->
        nil
    end
  end

  defp valid_mailto?(url) do
    byte_size(url) <= @max_mailto_len and Regex.match?(@mailto_href_re, url)
  end

  defp valid_web_url?(url) do
    parsed =
      if Regex.match?(~r/^https?:\/\//i, url) do
        URI.parse(url)
      else
        URI.parse("https://" <> url)
      end

    case parsed do
      %URI{scheme: scheme, host: host} when scheme in ["http", "https"] ->
        valid_web_hostname?(host)

      _ ->
        false
    end
  end

  defp valid_web_hostname?(host) when is_binary(host) do
    String.contains?(host, ".") and Regex.match?(@hostname_re, host)
  end

  defp valid_web_hostname?(_), do: false
end
