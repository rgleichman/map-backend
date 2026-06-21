defmodule Storymap.SubMaps.CommunityUrl do
  @moduledoc """
  Validates and normalizes community URL path segments.
  """

  @min_length 3
  @max_length 48
  @pattern ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/

  @reserved ~w(
    new design admin map api pins users user m
    login log-in register settings privacy about vision help
    dev admin
  )

  @type url_error :: :required | :too_short | :too_long | :reserved | :invalid_format
  @type validate_result :: {:ok, String.t()} | {:error, url_error()}

  @spec reserved_words() :: [String.t()]
  def reserved_words, do: @reserved

  @spec normalize(String.t() | nil) :: String.t() | nil
  def normalize(nil), do: nil

  def normalize(url) when is_binary(url) do
    url
    |> String.trim()
    |> String.downcase()
    |> then(fn s -> if s == "", do: nil, else: s end)
  end

  @spec generate_from_name(String.t()) :: String.t() | nil
  def generate_from_name(name) when is_binary(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/u, "-")
    |> String.trim("-")
    |> String.slice(0, @max_length)
    |> case do
      "" -> nil
      s -> s
    end
  end

  @spec validate(String.t() | any()) :: validate_result()
  def validate(url) when is_binary(url) do
    url = normalize(url)

    cond do
      is_nil(url) ->
        {:error, :required}

      String.length(url) < @min_length ->
        {:error, :too_short}

      String.length(url) > @max_length ->
        {:error, :too_long}

      url in @reserved ->
        {:error, :reserved}

      not Regex.match?(@pattern, url) ->
        {:error, :invalid_format}

      true ->
        {:ok, url}
    end
  end

  def validate(_), do: {:error, :required}

  @spec changeset_errors() :: map()
  def changeset_errors do
    %{
      required: "can't be blank",
      too_short: "must be at least #{@min_length} characters",
      too_long: "must be at most #{@max_length} characters",
      reserved: "is reserved",
      invalid_format: "must use lowercase letters, numbers, and hyphens only"
    }
  end

  @spec error_message(url_error() | term()) :: String.t()
  def error_message(:required), do: changeset_errors().required
  def error_message(key), do: Map.get(changeset_errors(), key, "is invalid")
end
