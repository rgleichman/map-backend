defmodule Mix.Tasks.NpmCmd do
  @moduledoc false

  @doc """
  Returns the `npx` executable name for the current OS.

  On Windows, Node installs `npx.cmd`; Erlang's `System.cmd/3` does not
  resolve that from bare `"npx"`.
  """
  @spec npx() :: String.t()
  def npx do
    case :os.type() do
      {:win32, _} -> "npx.cmd"
      _ -> "npx"
    end
  end

  @doc """
  Absolute path to an assets `node_modules/.bin` executable.

  Prefer this over `npx` in Mix tasks to avoid npx startup overhead.
  """
  @spec bin(String.t(), String.t()) :: String.t()
  def bin(assets_dir, name) when is_binary(assets_dir) and is_binary(name) do
    path = Path.join([assets_dir, "node_modules", ".bin", name])

    case :os.type() do
      {:win32, _} -> path <> ".cmd"
      _ -> path
    end
  end

  @doc """
  Runs an assets bin with stdout+stderr captured (for parallel precommit).
  """
  @spec run_bin(String.t(), String.t(), [String.t()]) :: {String.t(), non_neg_integer()}
  def run_bin(assets_dir, name, args)
      when is_binary(assets_dir) and is_binary(name) and is_list(args) do
    System.cmd(bin(assets_dir, name), args,
      cd: assets_dir,
      stderr_to_stdout: true
    )
  end
end
