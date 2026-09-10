defmodule Storymap.Trust do
  @moduledoc """
  Site-wide trust scores and ledger.

  Design: `docs/TRUST.md`. Privileges are gated when
  `trust_gates_enabled` is true in application config.
  """

  alias Storymap.Trust.Scores
  alias Storymap.Trust.UserTrustScore
  alias Storymap.Trust.Vouches

  @spec config() :: keyword()
  def config do
    Application.get_env(:storymap, __MODULE__, [])
  end

  @spec config(atom(), term()) :: term()
  def config(key, default \\ nil) do
    Keyword.get(config(), key, default)
  end

  @spec gates_enabled?() :: boolean()
  def gates_enabled? do
    config(:trust_gates_enabled, false) == true
  end

  @spec get_score(integer()) :: UserTrustScore.t() | nil
  def get_score(user_id) when is_integer(user_id) do
    Storymap.Repo.get_by(UserTrustScore, user_id: user_id)
  end

  @spec effective_trust(integer()) :: float()
  def effective_trust(user_id) when is_integer(user_id) do
    case get_score(user_id) do
      %UserTrustScore{t_effective: t} when is_float(t) -> t
      %UserTrustScore{t_effective: t} when is_integer(t) -> t * 1.0
      nil -> 0.0
    end
  end

  @spec recompute_all(DateTime.t() | nil) :: {:ok, non_neg_integer()}
  def recompute_all(as_of \\ nil) do
    Scores.recompute_all(as_of)
  end

  @spec seed_user?(integer()) :: boolean()
  def seed_user?(user_id) when is_integer(user_id) do
    user_id in Scores.seed_user_ids()
  end

  @spec vouch(Storymap.Accounts.User.t(), integer()) ::
          {:ok, Storymap.Trust.TrustVouch.t()} | Vouches.vouch_error()
  def vouch(actor, subject_id), do: Vouches.vouch(actor, subject_id)

  @spec revoke_vouch(Storymap.Accounts.User.t(), integer()) ::
          {:ok, :revoked} | Vouches.vouch_error()
  def revoke_vouch(actor, subject_id), do: Vouches.revoke_vouch(actor, subject_id)

  @spec vouch_budget_remaining(integer()) :: non_neg_integer()
  def vouch_budget_remaining(actor_id), do: Vouches.vouch_budget_remaining(actor_id)
end
