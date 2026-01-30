defmodule StorymapWeb.GeocodeJSON do
  @doc """
  Renders geocode search results.
  """
  def index(%{results: results}) do
    %{data: results}
  end
end
