defmodule Storymap.Trust.LocalTrust do
  @moduledoc """
  Build decayed raw edges and row-normalized local trust matrix `C`.

  See `docs/TRUST.md` §4.3–4.4.
  """

  import Ecto.Query

  alias Storymap.Repo
  alias Storymap.Trust
  alias Storymap.Trust.TrustEvent
  alias Storymap.Trust.TrustVouch

  @type edge_map :: %{{integer(), integer()} => float()}

  @doc """
  Returns row-normalized `C` as `%{{i, j} => c_ij}` and the list of user ids.

  Users with no outgoing edges get the seed prior row (`p`).
  """
  @spec build_matrix([integer()], %{integer() => float()}, DateTime.t(), keyword()) ::
          {edge_map(), [integer()]}
  def build_matrix(user_ids, p, as_of, opts \\ []) do
    raw = raw_edges(user_ids, as_of, opts)
    c = normalize(raw, user_ids, p)
    {c, user_ids}
  end

  @spec raw_edges([integer()], DateTime.t(), keyword()) :: edge_map()
  def raw_edges(user_ids, as_of, opts \\ []) do
    id_set = MapSet.new(user_ids)
    half_life_days = Keyword.get(opts, :half_life_days, Trust.config(:half_life_days, 180.0))
    w_vouch = Keyword.get(opts, :w_vouch, Trust.config(:w_vouch, 1.0))
    w_approve = Keyword.get(opts, :w_approve, Trust.config(:w_approve, 0.5))

    vouch_edges = vouch_raw(id_set, as_of, half_life_days, w_vouch)
    approve_edges = approve_raw(id_set, as_of, half_life_days, w_approve)

    Map.merge(vouch_edges, approve_edges, fn _k, a, b -> a + b end)
  end

  defp vouch_raw(id_set, as_of, half_life_days, w_vouch) do
    from(v in TrustVouch, select: {v.actor_user_id, v.subject_user_id, v.inserted_at})
    |> Repo.all()
    |> Enum.reduce(%{}, fn {actor, subject, inserted_at}, acc ->
      if MapSet.member?(id_set, actor) and MapSet.member?(id_set, subject) and actor != subject do
        w = decay(w_vouch, inserted_at, as_of, half_life_days)
        Map.update(acc, {actor, subject}, w, &(&1 + w))
      else
        acc
      end
    end)
  end

  defp approve_raw(id_set, as_of, half_life_days, w_approve) do
    from(e in TrustEvent,
      where: e.type == :pin_approve,
      select: {e.actor_user_id, e.subject_user_id, e.inserted_at}
    )
    |> Repo.all()
    |> Enum.group_by(fn {actor, subject, _} -> {actor, subject} end)
    |> Enum.reduce(%{}, fn {{actor, subject}, events}, acc ->
      if MapSet.member?(id_set, actor) and MapSet.member?(id_set, subject) and actor != subject do
        m_eff =
          Enum.reduce(events, 0.0, fn {_a, _s, inserted_at}, sum ->
            sum + decay(1.0, inserted_at, as_of, half_life_days)
          end)

        w = 1.0 - :math.pow(1.0 - w_approve, m_eff)
        Map.put(acc, {actor, subject}, w)
      else
        acc
      end
    end)
  end

  @doc false
  @spec decay(float(), DateTime.t(), DateTime.t(), float()) :: float()
  def decay(weight, inserted_at, as_of, half_life_days)
      when half_life_days == :infinity or half_life_days > 1.0e12 do
    _ = {inserted_at, as_of}
    weight
  end

  def decay(weight, inserted_at, as_of, half_life_days) when half_life_days > 0 do
    seconds = DateTime.diff(as_of, inserted_at, :second)
    days = max(seconds, 0) / 86_400
    weight * :math.pow(2.0, -days / half_life_days)
  end

  @spec normalize(edge_map(), [integer()], %{integer() => float()}) :: edge_map()
  def normalize(raw, user_ids, p) do
    Enum.reduce(user_ids, %{}, fn i, acc ->
      outs =
        user_ids
        |> Enum.map(fn j -> {j, Map.get(raw, {i, j}, 0.0)} end)
        |> Enum.filter(fn {_j, w} -> w > 0.0 end)

      case outs do
        [] ->
          # Fall back to seed prior row
          Enum.reduce(user_ids, acc, fn j, acc2 ->
            pj = Map.get(p, j, 0.0)

            if pj > 0.0 do
              Map.put(acc2, {i, j}, pj)
            else
              acc2
            end
          end)

        list ->
          sum = Enum.reduce(list, 0.0, fn {_j, w}, s -> s + w end)

          Enum.reduce(list, acc, fn {j, w}, acc2 ->
            Map.put(acc2, {i, j}, w / sum)
          end)
      end
    end)
  end
end
