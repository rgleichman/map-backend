defmodule StorymapWeb.PinTypeLive.FormTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.PinTypeLive.Form

  describe "validate_fields_from_params/1" do
    test "returns error when active field has blank label" do
      params = %{
        "fields" => %{
          "0" => %{"label" => "Status", "type" => "text", "key" => ""},
          "1" => %{"label" => "", "type" => "text", "required" => "true", "key" => ""}
        }
      }

      assert {:error, %{"1" => messages}} = Form.validate_fields_from_params(params)
      assert "Enter a label for this field" in messages
    end

    test "ignores inactive empty rows" do
      params = %{
        "fields" => %{
          "0" => %{"label" => "Status", "type" => "text", "key" => ""},
          "1" => %{"label" => "", "type" => "text", "key" => ""}
        }
      }

      assert {:ok, schema} = Form.validate_fields_from_params(params)
      assert [%{"key" => "status", "label" => "Status", "type" => "text"}] = schema["fields"]
    end

    test "returns error when select field has no options" do
      params = %{
        "fields" => %{
          "0" => %{"label" => "Status", "type" => "select", "options" => "", "key" => ""}
        }
      }

      assert {:error, %{"0" => ["Add at least one option (one per line)"]}} =
               Form.validate_fields_from_params(params)
    end

    test "returns error for duplicate labels" do
      params = %{
        "fields" => %{
          "0" => %{"label" => "Status", "type" => "text", "key" => ""},
          "1" => %{"label" => "Status", "type" => "text", "key" => ""}
        }
      }

      assert {:error, field_errors} = Form.validate_fields_from_params(params)
      assert field_errors["0"] == ["Another field already uses this label"]
      assert field_errors["1"] == ["Another field already uses this label"]
    end
  end

  describe "merge_field_keys/2" do
    test "derives keys from labels" do
      fields = [%{"key" => "", "label" => "Machine Status", "type" => "text"}]

      assert [%{"key" => "machine_status", "label" => "Machine Status"}] =
               Form.merge_field_keys([], fields)
    end

    test "preserves existing keys on edit" do
      fields = [%{"key" => "machine_status", "label" => "Machine Status", "type" => "text"}]
      prior = [%{"key" => "machine_status", "label" => "Old Label", "type" => "text"}]

      assert [%{"key" => "machine_status"}] = Form.merge_field_keys(prior, fields)
    end

    test "dedupes keys from similar labels" do
      fields = [
        %{"key" => "", "label" => "Status", "type" => "text"},
        %{"key" => "", "label" => "Status", "type" => "text"}
      ]

      [first, second] = Form.merge_field_keys([], fields)
      assert first["key"] == "status"
      assert second["key"] == "status_2"
    end

    test "prefixes invalid keys with field_" do
      fields = [%{"key" => "", "label" => "123", "type" => "text"}]

      assert [%{"key" => "field_123"}] = Form.merge_field_keys([], fields)
    end
  end

  describe "build_schema_from_params/1" do
    test "does not silently drop fields with labels" do
      params = %{
        "fields" => %{
          "0" => %{"label" => "Cost", "type" => "number", "key" => ""},
          "1" => %{"label" => "Notes", "type" => "textarea", "key" => ""}
        }
      }

      schema = Form.build_schema_from_params(params)
      keys = Enum.map(schema["fields"], & &1["key"])
      assert keys == ["cost", "notes"]
    end
  end

  describe "attrs_from_params/1" do
    test "builds schema and omits enabled when absent" do
      params = %{
        "label" => "Shop",
        "time_mode" => "hours",
        "fields" => %{
          "0" => %{"label" => "Notes", "type" => "text", "key" => ""}
        }
      }

      attrs = Form.attrs_from_params(params)
      assert attrs["label"] == "Shop"
      assert attrs["time_mode"] == "hours"
      refute Map.has_key?(attrs, "enabled")
      assert [%{"key" => "notes"}] = attrs["schema"]["fields"]
    end

    test "coerces enabled checkbox strings" do
      assert Form.attrs_from_params(%{"enabled" => "true", "fields" => %{}})["enabled"] == true
      assert Form.attrs_from_params(%{"enabled" => "false", "fields" => %{}})["enabled"] == false
    end
  end

  describe "fields_from_schema/1" do
    test "returns empty field row for empty schema" do
      assert [field] = Form.fields_from_schema(%{"fields" => []})
      assert field == Form.empty_field()
    end

    test "maps schema fields including select options" do
      schema = %{
        "fields" => [
          %{
            "key" => "status",
            "label" => "Status",
            "type" => "select",
            "required" => true,
            "options" => [%{"value" => "open", "label" => "Open"}]
          }
        ]
      }

      assert [field] = Form.fields_from_schema(schema)
      assert field["key"] == "status"
      assert field["required"] == true
      assert field["options"] == "open | Open"
    end
  end

  describe "field list helpers" do
    test "add_field appends an empty row" do
      assert length(Form.add_field([])) == 1
      assert hd(Form.add_field([])) == Form.empty_field()
    end

    test "remove_field drops by index" do
      fields = [
        %{"key" => "a", "label" => "A", "type" => "text"},
        %{"key" => "b", "label" => "B", "type" => "text"}
      ]

      assert Form.remove_field(fields, 0) == [
               %{"key" => "b", "label" => "B", "type" => "text"}
             ]
    end

    test "move_field swaps neighbors and no-ops at edges" do
      fields = [
        %{"key" => "a"},
        %{"key" => "b"},
        %{"key" => "c"}
      ]

      assert Form.move_field(fields, 0, -1) == fields

      assert Form.move_field(fields, 1, -1) == [
               %{"key" => "b"},
               %{"key" => "a"},
               %{"key" => "c"}
             ]
    end
  end

  describe "apply_fields_from_params/2" do
    test "returns unchanged without fields key" do
      assert Form.apply_fields_from_params([], %{"label" => "x"}) == :unchanged
    end

    test "merges keys and returns field errors" do
      current = [%{"key" => "status", "label" => "Old", "type" => "text"}]

      params = %{
        "fields" => %{
          "0" => %{"label" => "Status", "type" => "text", "key" => "status"}
        }
      }

      assert {[%{"key" => "status", "label" => "Status"}], %{}} =
               Form.apply_fields_from_params(current, params)
    end
  end
end
