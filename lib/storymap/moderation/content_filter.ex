defmodule Storymap.Moderation.ContentFilter do
  @moduledoc """
  Offline keyword/phrase hate-speech filter for user-generated text.

  Phrases come from application config (`:blocked_phrases`). Production may
  override via `HATE_SPEECH_BLOCKLIST` (comma-separated) in runtime config.
  """

  alias Ecto.Changeset
  alias Storymap.Pins.Pin
  alias Storymap.Tags.Tag

  @type text_source ::
          Changeset.t()
          | Pin.t()
          | %{optional(String.t() | atom()) => term()}

  @spec flagged?(String.t() | nil) :: boolean()
  def flagged?(nil), do: false

  def flagged?(text) when is_binary(text) do
    normalized = normalize(text)

    if normalized == "" do
      false
    else
      Enum.any?(blocked_phrases(), fn phrase ->
        phrase_normalized = normalize(phrase)
        phrase_normalized != "" and matches?(normalized, phrase_normalized)
      end)
    end
  end

  def flagged?(_), do: false

  @spec flagged_texts?([String.t() | nil]) :: boolean()
  def flagged_texts?(texts) when is_list(texts) do
    Enum.any?(texts, &flagged?/1)
  end

  @doc """
  Collects user-facing plain-text fields from a pin changeset, pin struct, or attrs map.
  """
  @spec extract_pin_texts(text_source()) :: [String.t()]
  def extract_pin_texts(%Changeset{} = changeset) do
    tags = Changeset.get_field(changeset, :tags) || []

    collect_texts(
      Changeset.get_field(changeset, :title),
      Changeset.get_field(changeset, :description),
      Changeset.get_field(changeset, :custom_data) || %{},
      Changeset.get_field(changeset, :ad_hoc_fields) || [],
      tags
    )
  end

  def extract_pin_texts(%Pin{} = pin) do
    tags = if Ecto.assoc_loaded?(pin.tags), do: pin.tags, else: []

    collect_texts(
      pin.title,
      pin.description,
      pin.custom_data || %{},
      pin.ad_hoc_fields || [],
      tags
    )
  end

  def extract_pin_texts(attrs) when is_map(attrs) do
    attrs = stringify_keys(attrs)

    collect_texts(
      Map.get(attrs, "title"),
      Map.get(attrs, "description"),
      Map.get(attrs, "custom_data") || %{},
      Map.get(attrs, "ad_hoc_fields") || [],
      Map.get(attrs, "tags") || []
    )
  end

  @spec blocked_phrases() :: [String.t()]
  def blocked_phrases do
    :storymap
    |> Application.get_env(__MODULE__, [])
    |> Keyword.get(:blocked_phrases, [])
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
  end

  defp collect_texts(title, description, custom_data, ad_hoc_fields, tags) do
    [
      title,
      description,
      extract_custom_data_texts(custom_data),
      extract_ad_hoc_texts(ad_hoc_fields),
      extract_tag_names(tags)
    ]
    |> List.flatten()
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
  end

  defp extract_custom_data_texts(data) when is_map(data) do
    Enum.flat_map(data, fn {_key, value} -> extract_value_texts(value) end)
  end

  defp extract_custom_data_texts(_), do: []

  defp extract_ad_hoc_texts(fields) when is_list(fields) do
    Enum.flat_map(fields, fn
      field when is_map(field) ->
        field = stringify_keys(field)

        [
          Map.get(field, "label"),
          extract_options_texts(Map.get(field, "options")),
          extract_value_texts(Map.get(field, "value"))
        ]

      _ ->
        []
    end)
    |> List.flatten()
  end

  defp extract_ad_hoc_texts(_), do: []

  defp extract_options_texts(options) when is_list(options) do
    Enum.flat_map(options, fn
      option when is_binary(option) ->
        [option]

      option when is_map(option) ->
        option = stringify_keys(option)
        [Map.get(option, "label"), Map.get(option, "value")]

      _ ->
        []
    end)
  end

  defp extract_options_texts(_), do: []

  defp extract_value_texts(value) when is_binary(value), do: [value]

  defp extract_value_texts(values) when is_list(values) do
    Enum.flat_map(values, &extract_value_texts/1)
  end

  defp extract_value_texts(%{"ref" => _}), do: []
  defp extract_value_texts(%{ref: _}), do: []

  defp extract_value_texts(map) when is_map(map) do
    # Blob refs and structured non-text values are skipped above; other maps
    # (unexpected) contribute nothing unless they look like option rows.
    []
  end

  defp extract_value_texts(_), do: []

  defp extract_tag_names(tags) when is_list(tags) do
    Enum.map(tags, fn
      %Tag{name: name} -> name
      %{"name" => name} when is_binary(name) -> name
      %{name: name} when is_binary(name) -> name
      name when is_binary(name) -> name
      _ -> nil
    end)
  end

  defp extract_tag_names(_), do: []

  defp matches?(haystack, phrase) do
    if String.contains?(phrase, " ") do
      String.contains?(haystack, phrase)
    else
      Regex.match?(~r/(?:^| )#{Regex.escape(phrase)}(?:$| )/u, haystack)
    end
  end

  defp normalize(text) when is_binary(text) do
    text
    |> String.downcase()
    |> String.replace(~r/[^\p{L}\p{N}\s]+/u, " ")
    |> String.replace(~r/\s+/u, " ")
    |> String.trim()
  end

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
