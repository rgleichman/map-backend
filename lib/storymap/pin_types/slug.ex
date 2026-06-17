defmodule Storymap.PinTypes.Slug do
  @moduledoc false

  @min_length 2
  @max_length 48
  @pattern ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/

  @reserved ~w(
    one_time scheduled food_bank other custom
    new admin map api pins pin-types
  )

  def normalize(nil), do: nil

  def normalize(slug) when is_binary(slug) do
    slug
    |> String.trim()
    |> String.downcase()
    |> then(fn s -> if s == "", do: nil, else: s end)
  end

  def generate_from_label(label) when is_binary(label) do
    label
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/u, "-")
    |> String.trim("-")
    |> String.slice(0, @max_length)
    |> case do
      "" -> nil
      s -> s
    end
  end

  def validate(slug) when is_binary(slug) do
    slug = normalize(slug)

    cond do
      is_nil(slug) -> {:error, :required}
      String.length(slug) < @min_length -> {:error, :too_short}
      String.length(slug) > @max_length -> {:error, :too_long}
      slug in @reserved -> {:error, :reserved}
      not Regex.match?(@pattern, slug) -> {:error, :invalid_format}
      true -> {:ok, slug}
    end
  end

  def error_message(:required), do: "can't be blank"
  def error_message(:too_short), do: "must be at least #{@min_length} characters"
  def error_message(:too_long), do: "must be at most #{@max_length} characters"
  def error_message(:reserved), do: "is reserved"
  def error_message(:invalid_format), do: "must use lowercase letters, numbers, and hyphens"
  def error_message(_), do: "is invalid"
end
