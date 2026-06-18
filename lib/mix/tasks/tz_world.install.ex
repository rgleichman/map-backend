defmodule Mix.Tasks.TzWorld.Install do
  @moduledoc """
  Installs timezone boundary data for `tz_world`, using `GITHUB_TOKEN` when set.

  Authenticated requests avoid GitHub API rate limits on shared build hosts (e.g. Render).
  Without a token, falls back to `mix tz_world.update`.

  ## Options

    * `--include-oceans` — include ocean timezone polygons (recommended for prod)
    * `--force` — reinstall even if the current release is already installed
    * `--trace` — verbose logging
  """
  @shortdoc "Install tz_world data (uses GITHUB_TOKEN when set)"

  @tag "[TzWorld]"

  @aliases [o: :include_oceans, f: :force, t: :trace]
  @strict [include_oceans: :boolean, force: :boolean, trace: :boolean]

  use Mix.Task

  alias TzWorld.Downloader

  require Logger

  @release_api_url "https://api.github.com/repos/evansiroky/timezone-boundary-builder/releases/latest"
  @timezones_geojson "timezones.geojson.zip"
  @timezones_with_oceans_geojson "timezones-with-oceans.geojson.zip"

  @impl Mix.Task
  def run(args) do
    case OptionParser.parse(args, aliases: @aliases, strict: @strict) do
      {options, [], []} ->
        include_oceans? = Keyword.get(options, :include_oceans, false)
        force_update? = Keyword.get(options, :force, false)
        trace? = Keyword.get(options, :trace, false)

        case System.get_env("GITHUB_TOKEN") do
          token when is_binary(token) and token != "" ->
            install_with_token(token, include_oceans?, force_update?, trace?)

          _ ->
            Mix.shell().info(
              "#{@tag} GITHUB_TOKEN not set; falling back to unauthenticated mix tz_world.update"
            )

            Mix.Task.run("tz_world.update", args)
        end

      _other ->
        Mix.raise(
          """
          Invalid arguments. `mix tz_world.install` accepts:
            --include-oceans / --no-include-oceans
            --force / --no-force
            --trace / --no-trace
          """,
          exit_status: 1
        )
    end
  end

  defp install_with_token(token, include_oceans?, force_update?, trace?) do
    start_applications()

    try do
      with {:ok, latest_release, asset_url} <- latest_release(token, include_oceans?, trace?),
           :ok <- install_release(latest_release, asset_url, force_update?, trace?) do
        :ok
      else
        {:error, reason} ->
          Mix.raise("#{@tag} Failed to install timezone data: #{inspect(reason)}", exit_status: 1)
      end
    after
      stop_backends()
    end
  end

  defp install_release(latest_release, asset_url, force_update?, trace?) do
    cond do
      force_update? ->
        Logger.info("#{@tag} Force installing release #{latest_release}.")
        fetch_release(latest_release, asset_url, trace?)

      true ->
        case Downloader.current_release() do
          {:ok, current_release} when latest_release <= current_release ->
            Logger.info(
              "#{@tag} Currently installed release #{current_release} is the latest release."
            )

            :ok

          {:ok, current_release} ->
            Logger.info("#{@tag} Updating from release #{current_release} to #{latest_release}.")
            fetch_release(latest_release, asset_url, trace?)

          {:error, :enoent} ->
            Logger.info(
              "#{@tag} No timezone geo data installed. Installing release #{latest_release}."
            )

            fetch_release(latest_release, asset_url, trace?)
        end
    end
  end

  defp fetch_release(latest_release, asset_url, trace?) do
    # Downloader.get_latest_release/3 returns nil on success (last expr is maybe_log/2).
    case Downloader.get_latest_release(latest_release, asset_url, trace?) do
      {:error, reason} -> {:error, reason}
      _ -> :ok
    end
  end

  defp latest_release(token, include_oceans?, trace?) do
    headers = [
      {~c"User-Agent", ~c"storymap-build"},
      {~c"Authorization", String.to_charlist("Bearer " <> token)}
    ]

    asset_name = asset_name(include_oceans?)

    with {:ok, json} <- Downloader.get({@release_api_url, headers}),
         {:ok, release} <- Jason.decode(json),
         release_name when is_binary(release_name) <- Map.get(release, "name"),
         assets when is_list(assets) <- Map.get(release, "assets", []),
         %{"browser_download_url" => asset_url} <- find_asset(assets, asset_name) do
      if trace? do
        Logger.info("#{@tag} Latest release #{release_name}, asset #{asset_name}")
      end

      {:ok, release_name, asset_url}
    else
      nil ->
        {:error, {:asset_not_found, asset_name(include_oceans?)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp asset_name(true), do: @timezones_with_oceans_geojson
  defp asset_name(false), do: @timezones_geojson

  defp find_asset(assets, name) do
    Enum.find(assets, &(&1["name"] == name))
  end

  defp start_applications do
    {:ok, _} = Application.ensure_all_started(:tz_world)
    {:ok, _} = Application.ensure_all_started(:inets)
    {:ok, _} = Application.ensure_all_started(:ssl)
    {:module, _} = Code.ensure_loaded(:ssl_cipher)

    TzWorld.Backend.Memory.start_link()
    TzWorld.Backend.Dets.start_link()
  end

  defp stop_backends do
    for module <- [TzWorld.Backend.Memory, TzWorld.Backend.Dets] do
      try do
        case module.stop() do
          :ok ->
            :ok

          other ->
            Logger.warning(
              "#{@tag} Unexpected stop result from #{inspect(module)}: #{inspect(other)}"
            )
        end
      catch
        kind, reason ->
          Logger.warning(
            "#{@tag} Failed to stop #{inspect(module)} (#{kind}): #{Exception.format(kind, reason, [])}"
          )
      end
    end

    :erlang.garbage_collect()
  end
end
