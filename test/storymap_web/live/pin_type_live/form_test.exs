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
end
