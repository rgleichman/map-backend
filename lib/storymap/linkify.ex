defmodule Storymap.Linkify do
  @moduledoc """
  Renders plain text with markdown-style `[label](url)` links and bare URLs
  (including scheme-less domains like `example.com` and email addresses) as safe HTML.
  Only emits validated link tags; all other content is HTML-escaped.
  """

  import Phoenix.HTML

  @domain_host ~r/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}/
  @domain ~r/(?:www\.)?#{Regex.source(@domain_host)}/
  @email ~r/[a-zA-Z0-9._%+-]+@#{Regex.source(@domain_host)}/
  @email_anchored Regex.compile!("^#{Regex.source(@email)}$")
  @mailto_href_re Regex.compile!(
                    "^mailto:#{Regex.source(@email)}(?:\\?[a-zA-Z0-9_\\-.*=&%+]*)?$",
                    [:caseless]
                  )
  @markdown_link_re Regex.compile!(
                      "\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+|mailto:[^\\s)]+|#{Regex.source(@email)}|#{Regex.source(@domain)}(?:\\/[^\\s)]*)?)\\)",
                      [:caseless]
                    )
  @bare_url_re Regex.compile!(
                 "(?:mailto:[^\\s<]+|#{Regex.source(@email)}|https?:\\/\\/[^\\s<]+|#{Regex.source(@domain)}(?:\\/[^\\s<]*)?)",
                 [:caseless]
               )
  @trailing_punctuation_re ~r/[.,;:!?'")\]]+$/
  @hostname_re ~r/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/
  @explicit_scheme_re ~r/^([a-zA-Z][a-zA-Z0-9+.-]*):/
  @ascii_scheme_re ~r/^[a-zA-Z][a-zA-Z0-9+.-]*:$/
  @disallowed_scheme_before_re ~r/(?:ftp|file|javascript|data|vbscript):[^\s]*$/i
  @max_mailto_len 2048

  @doc """
  Returns safe HTML for a description string, or an empty string for nil/blank input.
  """
  def render(nil), do: ""
  def render(""), do: ""

  def render(text) when is_binary(text) do
    parts =
      text
      |> parse_linkified_text()
      |> Enum.map(&segment_to_html/1)
      |> Enum.map(fn {:safe, inner} -> inner end)

    {:safe, parts}
  end

  defp parse_linkified_text(""), do: []

  defp parse_linkified_text(text) do
    matches = Regex.scan(@markdown_link_re, text, return: :index)

    if matches == [] do
      split_bare_urls(text)
    else
      parse_with_markdown_links(text, matches)
    end
  end

  defp parse_with_markdown_links(text, matches) do
    {segments, last_index} =
      Enum.reduce(matches, {[], 0}, fn [
                                         {match_start, match_len},
                                         {label_start, label_len},
                                         {url_start, url_len}
                                       ],
                                       {segments, last_index} ->
        label = String.slice(text, label_start, label_len)
        url = text |> String.slice(url_start, url_len) |> String.trim()

        segments =
          if match_start > last_index do
            segments ++ split_bare_urls(String.slice(text, last_index, match_start - last_index))
          else
            segments
          end

        segment =
          if safe_url?(url) do
            {:link, label, normalize_url(url)}
          else
            {:text, String.slice(text, match_start, match_len)}
          end

        {segments ++ [segment], match_start + match_len}
      end)

    if last_index < byte_size(text) do
      segments ++ split_bare_urls(String.slice(text, last_index..-1//1))
    else
      segments
    end
  end

  defp split_bare_urls(""), do: []

  defp split_bare_urls(text) do
    matches = Regex.scan(@bare_url_re, text, return: :index)

    if matches == [] do
      [{:text, text}]
    else
      split_bare_url_matches(text, matches)
    end
  end

  defp split_bare_url_matches(text, matches) do
    {segments, last_index} =
      Enum.reduce(matches, {[], 0}, fn [{start, len}], {segments, last_index} ->
        raw = String.slice(text, start, len)
        {candidate, trailing} = trim_trailing_punctuation(raw)

        segments =
          if start > last_index do
            segments ++ [{:text, String.slice(text, last_index, start - last_index)}]
          else
            segments
          end

        link_segments =
          if safe_url?(candidate) and not disallowed_scheme_prefix?(text, start) do
            normalized = normalize_url(candidate)
            base = [{:link, candidate, normalized}]
            if trailing != "", do: base ++ [{:text, trailing}], else: base
          else
            [{:text, raw}]
          end

        {segments ++ link_segments, start + len}
      end)

    if last_index < byte_size(text) do
      segments ++ [{:text, String.slice(text, last_index..-1//1)}]
    else
      segments
    end
  end

  defp trim_trailing_punctuation(raw) do
    case Regex.run(@trailing_punctuation_re, raw, return: :index) do
      [{start, len}] ->
        {String.slice(raw, 0, start), String.slice(raw, start, len)}

      _ ->
        {raw, ""}
    end
  end

  defp disallowed_scheme_prefix?(text, start) do
    prefix = String.slice(text, 0, start)
    Regex.match?(@disallowed_scheme_before_re, prefix)
  end

  defp sanitize_link_input(url) do
    url |> String.trim() |> String.normalize(:nfkc)
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

  defp normalize_url(url) do
    url = sanitize_link_input(url)
    lower = String.downcase(url)

    cond do
      String.starts_with?(lower, "mailto:") -> url
      Regex.match?(~r/^https?:\/\//i, url) -> url
      Regex.match?(@email_anchored, url) -> "mailto:" <> url
      true -> "https://" <> url
    end
  end

  defp safe_url?(url) do
    url = sanitize_link_input(url)
    if url == "", do: false, else: safe_url_normalized?(url)
  end

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

  defp segment_to_html({:text, value}), do: html_escape(value)

  defp segment_to_html({:link, label, href}) do
    mailto? = String.starts_with?(String.downcase(href), "mailto:")

    security_attrs =
      if mailto? do
        ""
      else
        " target=\"_blank\" rel=\"noopener noreferrer\""
      end

    {:safe,
     [
       "<a href=\"",
       Phoenix.HTML.Engine.encode_to_iodata!(href),
       "\"",
       security_attrs,
       " class=\"link link-primary\">",
       Phoenix.HTML.Engine.encode_to_iodata!(label),
       "</a>"
     ]}
  end
end
