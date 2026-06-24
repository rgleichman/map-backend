defmodule Storymap.Types do
  @moduledoc """
  Shared result types for Storymap contexts.

  ## Auth error atoms

  - `{:error, :unauthorized}` — no authenticated user in scope (missing session).
  - `{:error, :forbidden}` — user is authenticated but the action is denied
    (muted, ownership, or policy).

  Admin-only contexts may return `:unauthorized` when the scope user lacks admin
  privileges.
  """

  @type forbidden :: {:error, :forbidden}
  @type unauthorized :: {:error, :unauthorized}
  @type auth_error :: forbidden() | unauthorized()
  @type authorize_result :: :ok | forbidden()

  @type ecto_ok(t) :: {:ok, t}
  @type ecto_err :: {:error, Ecto.Changeset.t()}
  @type ecto_result(t) :: ecto_ok(t) | ecto_err()
end
