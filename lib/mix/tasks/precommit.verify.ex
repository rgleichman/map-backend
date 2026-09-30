defmodule Mix.Tasks.Precommit.Verify do
  @shortdoc "Runs Elixir tests, tsc, and vitest in parallel (used by precommit)"
  @moduledoc false

  use Mix.Task

  @impl Mix.Task
  @spec run([String.t()]) :: :ok
  def run(_args) do
    assets_dir = Path.join(File.cwd!(), "assets")

    tsc_task =
      Task.async(fn ->
        Mix.Tasks.NpmCmd.run_bin(assets_dir, "tsc", ["-p", "tsconfig.json", "--noEmit"])
      end)

    vitest_task =
      Task.async(fn ->
        Mix.Tasks.NpmCmd.run_bin(assets_dir, "vitest", ["run"])
      end)

    test_ok? = run_elixir_tests()

    {tsc_out, tsc_code} = Task.await(tsc_task, :infinity)
    {vitest_out, vitest_code} = Task.await(vitest_task, :infinity)

    write_section("tsc", tsc_out)
    write_section("vitest", vitest_out)

    cond do
      tsc_code != 0 ->
        System.halt(tsc_code)

      vitest_code != 0 ->
        System.halt(vitest_code)

      not test_ok? ->
        System.halt(1)

      true ->
        :ok
    end
  end

  @spec run_elixir_tests() :: boolean()
  defp run_elixir_tests do
    Mix.Task.rerun("test", ["--raise"])
    true
  rescue
    Mix.Error -> false
  end

  @spec write_section(String.t(), String.t()) :: :ok
  defp write_section(label, output) do
    IO.puts("\n==> #{label}")

    if output != "" do
      IO.write(output)
    end

    :ok
  end
end
