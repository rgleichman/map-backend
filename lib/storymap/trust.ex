defmodule Storymap.Trust do
  @moduledoc """
  Site-wide trust scores and ledger.

  Design: `docs/TRUST.md`. Privileges are gated when
  `trust_gates_enabled` is true in application config.
  """

  alias Storymap.Trust.UserTrustScore

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
end
