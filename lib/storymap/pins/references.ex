defmodule Storymap.Pins.References do
  @moduledoc """
  Syncs explicit and text-derived pin references on create/update.
  """
  import Ecto.Changeset, only: [add_error: 3, change: 1]
  import Ecto.Query, only: [from: 2]

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType
  alias Storymap.PinTypes.Schema, as: PinTypeSchema
  alias Storymap.Pins.{Pin, PinReference, ReferenceParser, Visibility}
  alias Storymap.Repo
  alias Storymap.Types

  @max_explicit_links 10
  @text_field_types ~w(text textarea)

  @spec sync(Pin.t(), map()) :: Types.ecto_result(Pin.t())
  def sync(%Pin{id: source_id} = pin, attrs) when is_integer(source_id) do
    explicit_ids = normalize_linked_pin_ids(Map.get(attrs, "linked_pin_ids", []))
    text_refs = extract_text_references(pin)
    rows = build_reference_rows(source_id, explicit_ids, text_refs)

    with :ok <- validate_reference_rows(pin, rows) do
      _ =
        from(r in PinReference, where: r.source_pin_id == ^source_id)
        |> Repo.delete_all()

      Enum.each(rows, fn row_attrs ->
        %PinReference{}
        |> PinReference.changeset(row_attrs)
        |> Repo.insert!()
      end)

      {:ok, pin}
    end
  end

  def sync(%Pin{} = pin, _attrs), do: {:ok, pin}

  defp normalize_linked_pin_ids(ids) when is_list(ids) do
    ids
    |> Enum.flat_map(fn
      id when is_integer(id) ->
        [id]

      id when is_binary(id) ->
        case Integer.parse(id) do
          {n, ""} -> [n]
          _ -> []
        end

      _ ->
        []
    end)
    |> Enum.uniq()
    |> Enum.take(@max_explicit_links)
  end

  defp normalize_linked_pin_ids(_), do: []

  defp build_reference_rows(source_pin_id, explicit_ids, text_refs) do
    explicit_targets = MapSet.new(explicit_ids)

    explicit_rows =
      explicit_ids
      |> Enum.with_index()
      |> Enum.map(fn {target_id, position} ->
        %{
          source_pin_id: source_pin_id,
          target_pin_id: target_id,
          kind: :explicit,
          source_field: nil,
          position: position
        }
      end)

    text_rows =
      text_refs
      |> Enum.reject(fn {target_id, _} -> MapSet.member?(explicit_targets, target_id) end)
      |> Enum.map(fn {target_id, source_field} ->
        %{
          source_pin_id: source_pin_id,
          target_pin_id: target_id,
          kind: :text,
          source_field: source_field,
          position: nil
        }
      end)

    explicit_rows ++ text_rows
  end

  defp extract_text_references(%Pin{} = pin) do
    origin = ReferenceParser.default_origin()
    refs = []

    refs =
      if is_binary(pin.description) and String.trim(pin.description) != "" do
        refs ++ field_text_refs(pin.description, "description", origin)
      else
        refs
      end

    refs ++ custom_text_field_refs(pin, origin)
  end

  defp field_text_refs(text, source_field, origin) do
    ReferenceParser.extract_pin_ids_from_text(text, origin)
    |> Enum.map(&{&1, source_field})
    |> Enum.uniq_by(fn {target_id, _} -> target_id end)
  end

  defp custom_text_field_refs(%Pin{pin_type: "custom:" <> _} = pin, origin) do
    case PinTypes.get_by_pin_type(pin.pin_type) do
      %CustomPinType{} = custom_type ->
        PinTypeSchema.fields(custom_type.schema)
        |> Enum.flat_map(fn field ->
          key = field_key(field)
          type = field_type(field)

          if key && type in @text_field_types do
            value = Map.get(pin.custom_data || %{}, key)

            if is_binary(value) and String.trim(value) != "" do
              field_text_refs(value, "custom_data.#{key}", origin)
            else
              []
            end
          else
            []
          end
        end)
        |> Enum.uniq_by(fn {target_id, _} -> target_id end)

      _ ->
        []
    end
  end

  defp custom_text_field_refs(_pin, _origin), do: []

  defp validate_reference_rows(%Pin{id: source_pin_id} = source_pin, rows) do
    explicit_count = Enum.count(rows, &(&1.kind == :explicit))
    target_ids = Enum.map(rows, & &1.target_pin_id)

    cond do
      explicit_count > @max_explicit_links ->
        {:error, reference_error("too many explicit links (max #{@max_explicit_links})")}

      Enum.any?(target_ids, &(&1 == source_pin_id)) ->
        {:error, reference_error("cannot link a pin to itself")}

      true ->
        validate_reference_targets(target_ids, source_pin)
    end
  end

  defp validate_reference_targets([], _source_pin), do: :ok

  defp validate_reference_targets(target_ids, %Pin{} = source_pin) do
    targets =
      from(p in Pin, where: p.id in ^target_ids)
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    missing =
      target_ids
      |> Enum.uniq()
      |> Enum.reject(&linkable_target?(source_pin, Map.get(targets, &1)))

    if missing == [] do
      :ok
    else
      {:error, reference_error("invalid or unavailable pin link")}
    end
  end

  defp linkable_target?(_source, nil), do: false

  defp linkable_target?(%Pin{} = source, %Pin{status: :approved} = target) do
    Visibility.world_visible?(target) or same_sub_map?(source, target)
  end

  defp linkable_target?(_, _), do: false

  defp same_sub_map?(%Pin{sub_map_id: sid}, %Pin{sub_map_id: sid}) when not is_nil(sid), do: true
  defp same_sub_map?(_, _), do: false

  defp reference_error(message) do
    %Pin{}
    |> change()
    |> add_error(:linked_pin_ids, message)
  end

  defp field_key(%{"key" => key}) when is_binary(key), do: key
  defp field_key(%{key: key}) when is_binary(key), do: key
  defp field_key(_), do: nil

  defp field_type(%{"type" => type}) when is_binary(type), do: type
  defp field_type(%{type: type}) when is_binary(type), do: type
  defp field_type(_), do: nil
end
