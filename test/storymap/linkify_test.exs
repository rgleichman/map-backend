defmodule Storymap.LinkifyTest do
  use ExUnit.Case, async: true

  alias Storymap.Linkify

  describe "render/1" do
    test "returns empty string for nil and blank input" do
      assert Linkify.render(nil) == ""
      assert Linkify.render("") == ""
    end

    test "renders markdown links" do
      html =
        Linkify.render("Visit [site](https://example.com) today.")
        |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="https://example.com")
      assert html =~ ">site<"
      assert html =~ "Visit "
      assert html =~ " today."
    end

    test "autolinks bare URLs" do
      html =
        Linkify.render("See https://example.com for details.") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="https://example.com")
      assert html =~ ">https://example.com<"
      assert html =~ "See "
      assert html =~ " for details."
    end

    test "renders markdown links without a scheme" do
      html =
        Linkify.render("Visit [site](example.com) today.")
        |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="https://example.com")
      assert html =~ ">site<"
    end

    test "autolinks scheme-less domains" do
      html = Linkify.render("See example.com for details.") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="https://example.com")
      assert html =~ ">example.com<"
      assert html =~ "See "
      assert html =~ " for details."
    end

    test "autolinks bare mailto URLs" do
      html =
        Linkify.render("Email mailto:team@example.com today.") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="mailto:team@example.com")
      refute html =~ ~s(href="https://example.com")
    end

    test "autolinks bare email addresses" do
      html = Linkify.render("Contact team@example.com for info.") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="mailto:team@example.com")
      assert html =~ ">team@example.com<"
      refute html =~ ~s(href="https://example.com")
    end

    test "renders markdown email links" do
      html = Linkify.render("[Email us](team@example.com)") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="mailto:team@example.com")
      assert html =~ ">Email us<"
      refute html =~ ~s(target="_blank")
    end

    test "strips trailing punctuation from bare URLs" do
      html = Linkify.render("Go to example.com.") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="https://example.com")
      assert String.ends_with?(html, ".")
      refute html =~ ~s(href="https://example.com.")
    end

    test "does not link unsafe markdown URLs" do
      html = Linkify.render("[click](javascript:alert(1))") |> Phoenix.HTML.safe_to_string()

      refute html =~ "<a"
      assert html =~ "[click](javascript:alert(1))"
    end

    test "does not link unsafe bare URLs" do
      html = Linkify.render("javascript:alert(1)") |> Phoenix.HTML.safe_to_string()

      refute html =~ "<a"
      assert html =~ "javascript:alert(1)"
    end

    test "does not link malformed mailto URLs" do
      html = Linkify.render("mailto:javascript:alert(1)") |> Phoenix.HTML.safe_to_string()

      refute html =~ "<a"
      assert html =~ "mailto:javascript:alert(1)"
    end

    test "does not link disallowed schemes in markdown" do
      html = Linkify.render("[site](ftp://example.com)") |> Phoenix.HTML.safe_to_string()

      refute html =~ "<a"
      assert html =~ "[site](ftp://example.com)"
    end

    test "allows mailto with query params" do
      html =
        Linkify.render("[Email](mailto:team@example.com?subject=Hello)")
        |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(href="mailto:team@example.com?subject=Hello")
    end

    test "escapes HTML in plain text" do
      html = Linkify.render("<script>alert(1)</script>") |> Phoenix.HTML.safe_to_string()

      refute html =~ "<script>"
      assert html =~ "&lt;script&gt;"
    end

    test "link tags include security attributes" do
      html = Linkify.render("[site](https://example.com)") |> Phoenix.HTML.safe_to_string()

      assert html =~ ~s(target="_blank")
      assert html =~ ~s(rel="noopener noreferrer")
    end
  end
end
