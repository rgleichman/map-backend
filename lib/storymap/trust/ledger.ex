defmodule Storymap.Trust.Ledger do
  @moduledoc """
  Append trust ledger events. See `docs/TRUST.md` §5.
  """

  alias Storymap.Repo
  alias Storymap.Trust.Recompute
  alias Storymap.Trust.TrustEvent

  @type record_result :: {:ok, TrustEvent.t()} | {:ok, :duplicate} | {:error, Ecto.Changeset.t()}

  @doc """
  Record a pin_approve edge from approver to pin author. Idempotent per
  `(actor_user_id, pin_id)`.
  """
  @spec record_pin_approve(integer(), integer(), integer(), map()) :: record_result()
  def record_pin_approve(actor_user_id, subject_user_id, pin_id, payload \\ %{})
      when is_integer(actor_user_id) and is_integer(subject_user_id) and is_integer(pin_id) do
    if actor_user_id == subject_user_id do
      {:ok, :duplicate}
    else
      attrs = %{
        type: :pin_approve,
        actor_user_id: actor_user_id,
        subject_user_id: subject_user_id,
        pin_id: pin_id,
        payload: payload
      }

      case %TrustEvent{} |> TrustEvent.changeset(attrs) |> Repo.insert() do
        {:ok, event} ->
          Recompute.schedule_soon()
          {:ok, event}

        {:error, %Ecto.Changeset{errors: errors} = changeset} ->
          if unique_pin_approve_conflict?(errors) do
            {:ok, :duplicate}
          else
            {:error, changeset}
          end
      end
    end
  end

  defp unique_pin_approve_conflict?(errors) do
    Enum.any?(errors, fn
      {:actor_user_id, {_, opts}} -> opts[:constraint] == :unique
      {:pin_id, {_, opts}} -> opts[:constraint] == :unique
      _ -> false
    end)
  end
end
