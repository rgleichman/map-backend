defmodule Storymap.Trust.Vouches do
  @moduledoc """
  Active vouch grant/revoke with ledger events. See `docs/TRUST.md`.
  """

  import Ecto.Query

  alias Storymap.Accounts.User
  alias Storymap.Repo
  alias Storymap.Trust
  alias Storymap.Trust.Policy
  alias Storymap.Trust.Recompute
  alias Storymap.Trust.TrustEvent
  alias Storymap.Trust.TrustVouch
  alias Storymap.Types

  @type vouch_error ::
          Types.forbidden()
          | {:error, :not_found}
          | {:error, :self_vouch}
          | {:error, :vouch_budget}
          | {:error, :already_vouched}
          | Types.ecto_err()

  @spec vouch_budget_remaining(integer()) :: non_neg_integer()
  def vouch_budget_remaining(actor_id) when is_integer(actor_id) do
    k = Trust.config(:vouch_budget_k, 5)

    used =
      from(v in TrustVouch, where: v.actor_user_id == ^actor_id, select: count(v.id))
      |> Repo.one()

    max(k - used, 0)
  end

  @spec vouch(User.t(), integer()) :: {:ok, TrustVouch.t()} | vouch_error()
  def vouch(%User{} = actor, subject_id) when is_integer(subject_id) do
    cond do
      not Policy.can_vouch?(actor) ->
        {:error, :forbidden}

      actor.id == subject_id ->
        {:error, :self_vouch}

      is_nil(Repo.get(User, subject_id)) ->
        {:error, :not_found}

      vouch_budget_remaining(actor.id) <= 0 ->
        {:error, :vouch_budget}

      true ->
        do_vouch(actor.id, subject_id)
    end
  end

  @spec revoke_vouch(User.t(), integer()) :: {:ok, :revoked} | vouch_error()
  def revoke_vouch(%User{} = actor, subject_id) when is_integer(subject_id) do
    case Repo.get_by(TrustVouch, actor_user_id: actor.id, subject_user_id: subject_id) do
      nil ->
        {:error, :not_found}

      %TrustVouch{} = vouch ->
        Repo.transaction(fn ->
          {:ok, _} = Repo.delete(vouch)

          {:ok, _} =
            %TrustEvent{}
            |> TrustEvent.changeset(%{
              type: :vouch_revoke,
              actor_user_id: actor.id,
              subject_user_id: subject_id,
              payload: %{}
            })
            |> Repo.insert()

          :revoked
        end)
        |> case do
          {:ok, :revoked} ->
            Recompute.schedule_soon()
            {:ok, :revoked}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp do_vouch(actor_id, subject_id) do
    Repo.transaction(fn ->
      case %TrustVouch{}
           |> TrustVouch.changeset(%{actor_user_id: actor_id, subject_user_id: subject_id})
           |> Repo.insert() do
        {:ok, vouch} ->
          {:ok, _} =
            %TrustEvent{}
            |> TrustEvent.changeset(%{
              type: :vouch,
              actor_user_id: actor_id,
              subject_user_id: subject_id,
              payload: %{}
            })
            |> Repo.insert()

          vouch

        {:error, %Ecto.Changeset{} = changeset} ->
          if unique_vouch_conflict?(changeset) do
            Repo.rollback(:already_vouched)
          else
            Repo.rollback(changeset)
          end
      end
    end)
    |> case do
      {:ok, vouch} ->
        Recompute.schedule_soon()
        {:ok, vouch}

      {:error, :already_vouched} ->
        {:error, :already_vouched}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}

      {:error, other} ->
        {:error, other}
    end
  end

  defp unique_vouch_conflict?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:actor_user_id, {_, opts}} -> opts[:constraint] == :unique
      {:subject_user_id, {_, opts}} -> opts[:constraint] == :unique
      _ -> false
    end)
  end
end
