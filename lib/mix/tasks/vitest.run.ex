defmodule Mix.Tasks.Vitest.Run do
  @shortdoc "Runs vitest in assets (used by precommit)"
  @moduledoc false

  use Mix.Task

  @impl Mix.Task
  def run(_args) do
    assets_dir = Path.join(File.cwd!(), "assets")

    {output, exit_code} = System.cmd("npx", ["vitest", "run"], cd: assets_dir)

    IO.write(output)

    if exit_code != 0 do
      System.halt(exit_code)
    end
  end
end
