defmodule Mix.Tasks.Tsc.Run do
  @shortdoc "Runs TypeScript compiler check in assets (used by precommit)"
  @moduledoc false

  use Mix.Task

  @impl Mix.Task
  @spec run([String.t()]) :: :ok
  def run(_args) do
    assets_dir = Path.join(File.cwd!(), "assets")

    {output, exit_code} =
      Mix.Tasks.NpmCmd.run_bin(assets_dir, "tsc", ["-p", "tsconfig.json", "--noEmit"])

    IO.write(output)

    if exit_code != 0 do
      System.halt(exit_code)
    end

    :ok
  end
end
