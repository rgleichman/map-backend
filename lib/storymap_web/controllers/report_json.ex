defmodule StorymapWeb.ReportJSON do
  @moduledoc false

  @spec show(map()) :: map()
  def show(%{report: report}) do
    %{data: data(report)}
  end

  defp data(report) do
    %{
      id: report.id,
      subject_type: report.subject_type,
      subject_id: report.subject_id,
      subject_label: report.subject_label,
      category: to_string(report.category),
      details: report.details,
      resolved_at: datetime_iso(report.resolved_at),
      inserted_at: datetime_iso(report.inserted_at)
    }
  end

  defp datetime_iso(nil), do: nil

  defp datetime_iso(%DateTime{} = dt) do
    dt |> DateTime.truncate(:second) |> DateTime.to_iso8601()
  end
end
