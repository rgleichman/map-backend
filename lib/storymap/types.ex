defmodule Storymap.Types do
  @moduledoc false

  @type forbidden :: {:error, :forbidden}
  @type unauthorized :: {:error, :unauthorized}
  @type auth_error :: forbidden() | unauthorized()
  @type authorize_result :: :ok | forbidden()

  @type ecto_ok(t) :: {:ok, t}
  @type ecto_err :: {:error, Ecto.Changeset.t()}
  @type ecto_result(t) :: ecto_ok(t) | ecto_err()
end
