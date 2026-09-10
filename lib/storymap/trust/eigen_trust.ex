defmodule Storymap.Trust.EigenTrust do
  @moduledoc """
  EigenTrust / PageRank-style iteration. See `docs/TRUST.md` §4.6.
  """

  @doc """
  Iterate until L1 change is below `tol` or `max_iter` is reached.

  `c` is a map of `{i, j} => c_ij` (row-normalized local trust).
  `p` is a map of `user_id => prior` (sums to 1).
  `user_ids` is the full user id list.
  """
  @spec iterate(%{{integer(), integer()} => float()}, %{integer() => float()}, [integer()], keyword()) ::
          %{integer() => float()}
  def iterate(c, p, user_ids, opts \\ []) do
    a = Keyword.get(opts, :a, 0.85)
    tol = Keyword.get(opts, :tol, 1.0e-10)
    max_iter = Keyword.get(opts, :max_iter, 100)

    t0 = Map.new(user_ids, fn id -> {id, Map.get(p, id, 0.0)} end)
    do_iterate(c, p, user_ids, t0, a, tol, max_iter, 0)
  end

  defp do_iterate(_c, _p, _user_ids, t, _a, _tol, max_iter, iter) when iter >= max_iter, do: t

  defp do_iterate(c, p, user_ids, t, a, tol, max_iter, iter) do
    t_next =
      Map.new(user_ids, fn j ->
        flow =
          Enum.reduce(user_ids, 0.0, fn i, acc ->
            acc + Map.get(c, {i, j}, 0.0) * Map.fetch!(t, i)
          end)

        {j, (1.0 - a) * Map.get(p, j, 0.0) + a * flow}
      end)

    delta =
      Enum.reduce(user_ids, 0.0, fn id, acc ->
        acc + abs(Map.fetch!(t_next, id) - Map.fetch!(t, id))
      end)

    if delta < tol do
      t_next
    else
      do_iterate(c, p, user_ids, t_next, a, tol, max_iter, iter + 1)
    end
  end

  @doc """
  Rank-calibrate raw trust mass to `[0, 1]` (lowest → 0, highest → 1).
  Ties use average ranks.
  """
  @spec calibrate(%{integer() => float()}) :: %{integer() => float()}
  def calibrate(raw) when map_size(raw) == 0, do: %{}

  def calibrate(raw) when map_size(raw) == 1 do
    [{id, _}] = Map.to_list(raw)
    %{id => 1.0}
  end

  def calibrate(raw) do
    n = map_size(raw)
    sorted = Enum.sort_by(Map.to_list(raw), fn {_id, v} -> v end)
    ranks = average_ranks(sorted)

    Map.new(ranks, fn {id, rank} ->
      {id, (rank - 1.0) / (n - 1)}
    end)
  end

  # sorted ascending by value; return [{id, average_rank}] with ranks 1..n
  defp average_ranks(sorted) do
    sorted
    |> Enum.with_index(1)
    |> Enum.chunk_by(fn {{_id, v}, _rank} -> v end)
    |> Enum.flat_map(fn group ->
      ranks = Enum.map(group, fn {_pair, rank} -> rank end)
      avg = Enum.sum(ranks) / length(ranks)
      Enum.map(group, fn {{id, _v}, _} -> {id, avg} end)
    end)
  end
end
