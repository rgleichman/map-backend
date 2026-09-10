defmodule Storymap.Trust.Scores do
  @moduledoc """
  Recompute and persist `user_trust_scores`. See `docs/TRUST.md`.
  """

  import Ecto.Query

  alias Storymap.Accounts.User
  alias Storymap.Repo
  alias Storymap.Trust
  alias Storymap.Trust.EigenTrust
  alias Storymap.Trust.Identity
  alias Storymap.Trust.LocalTrust
  alias Storymap.Trust.UserTrustScore

  @spec params_version(keyword()) :: String.t()
  def params_version(opts \\ []) do
    a = Keyword.get(opts, :a, Trust.config(:eigen_a, 0.85))
    h = Keyword.get(opts, :half_life_days, Trust.config(:half_life_days, 180.0))
    alpha = Keyword.get(opts, :alpha, Trust.config(:alpha, 0.85))
    beta = Keyword.get(opts, :beta, Trust.config(:beta, 0.15))
    seeds = seed_user_ids(opts) |> Enum.sort() |> Enum.join(",")

    :crypto.hash(:sha256, "#{a}|#{h}|#{alpha}|#{beta}|#{seeds}")
    |> Base.encode16(case: :lower)
    |> binary_part(0, 16)
  end

  @spec seed_user_ids(keyword()) :: [integer()]
  def seed_user_ids(opts \\ []) do
    bootstrap = Keyword.get(opts, :bootstrap_user_ids, Trust.config(:bootstrap_user_ids, []))

    admin_ids =
      from(u in User, where: u.admin_level >= 1, select: u.id)
      |> Repo.all()

    (admin_ids ++ List.wrap(bootstrap))
    |> Enum.uniq()
  end

  @doc """
  Full recompute for all users as of `as_of` (default now).
  Returns `{:ok, count}` of upserted score rows.
  """
  @spec recompute_all(DateTime.t() | nil, keyword()) :: {:ok, non_neg_integer()}
  def recompute_all(as_of \\ nil, opts \\ []) do
    as_of = as_of || DateTime.utc_now() |> DateTime.truncate(:second)
    user_ids = from(u in User, select: u.id, order_by: [asc: u.id]) |> Repo.all()
    version = params_version(opts)

    if user_ids == [] do
      {:ok, 0}
    else
      seeds = seed_user_ids(opts)
      p = prior(seeds, user_ids)
      a = Keyword.get(opts, :a, Trust.config(:eigen_a, 0.85))
      alpha = Keyword.get(opts, :alpha, Trust.config(:alpha, 0.85))
      beta = Keyword.get(opts, :beta, Trust.config(:beta, 0.15))

      {c, _} = LocalTrust.build_matrix(user_ids, p, as_of, opts)
      raw = EigenTrust.iterate(c, p, user_ids, a: a)
      cal = EigenTrust.calibrate(raw)

      users =
        from(u in User, where: u.id in ^user_ids, select: {u.id, u})
        |> Repo.all()
        |> Map.new()

      email_bonus =
        Keyword.get(opts, :email_confirmed_bonus, Trust.config(:email_confirmed_bonus, 0.2))

      count =
        Enum.reduce(user_ids, 0, fn id, acc ->
          t_social_raw = Map.get(raw, id, 0.0)
          t_social_cal = Map.get(cal, id, 0.0)
          user = Map.fetch!(users, id)
          t_id = Identity.t_id(user, email_confirmed_bonus: email_bonus)

          t_effective =
            (alpha * t_social_cal + beta * t_id)
            |> max(0.0)
            |> min(1.0)

          attrs = %{
            user_id: id,
            t_social_raw: t_social_raw,
            t_social_cal: t_social_cal,
            t_id: t_id,
            t_effective: t_effective,
            computed_at: as_of,
            params_version: version
          }

          upsert_score!(attrs)
          acc + 1
        end)

      {:ok, count}
    end
  end

  defp prior([], user_ids) do
    # No seeds: uniform prior so iteration is well-defined
    n = length(user_ids)
    mass = if n == 0, do: 0.0, else: 1.0 / n
    Map.new(user_ids, fn id -> {id, mass} end)
  end

  defp prior(seeds, user_ids) do
    seed_set = MapSet.new(seeds)
    n = MapSet.size(seed_set)
    mass = 1.0 / n

    Map.new(user_ids, fn id ->
      if MapSet.member?(seed_set, id), do: {id, mass}, else: {id, 0.0}
    end)
  end

  defp upsert_score!(attrs) do
    case Repo.get_by(UserTrustScore, user_id: attrs.user_id) do
      nil ->
        %UserTrustScore{}
        |> UserTrustScore.changeset(attrs)
        |> Repo.insert!()

      existing ->
        existing
        |> UserTrustScore.changeset(attrs)
        |> Repo.update!()
    end
  end
end
