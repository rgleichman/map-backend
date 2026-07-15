defmodule Mix.Tasks.NpmCmd do
  @moduledoc false

  @doc """
  Returns the `npx` executable name for the current OS.

  On Windows, Node installs `npx.cmd`; Erlang's `System.cmd/3` does not
  resolve that from bare `"npx"`.
  """
  def npx do
    case :os.type() do
      {:win32, _} -> "npx.cmd"
      _ -> "npx"
    end
  end
end
