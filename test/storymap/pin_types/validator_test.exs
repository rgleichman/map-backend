defmodule Storymap.PinTypes.ValidatorTest do
  use Storymap.DataCase

  import Storymap.PinTypesFixtures
  import Ecto.Changeset, only: [get_field: 2]

  alias Storymap.Pins.Pin
  alias Storymap.PinTypes.Validator

  test "validates required custom fields" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "missing required fields: Status" in errors_on(changeset).custom_data
  end

  test "accepts valid custom data" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "working", "cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert get_field(changeset, :custom_data) == %{"status" => "working", "cost" => 1}
  end

  test "rejects nil pin type" do
    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:missing",
        "custom_data" => %{},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(nil)

    assert "references an unknown custom pin type" in errors_on(changeset).pin_type
  end

  test "rejects custom_data that exceeds JSON size limit" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "notes", "label" => "Notes", "type" => "text", "required" => false}
          ]
        }
      })

    oversized = String.duplicate("x", 17_000)

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"notes" => oversized},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "is too large" in errors_on(changeset).custom_data
  end

  test "rejects text fields that are too long" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "notes", "label" => "Notes", "type" => "text", "required" => true}
          ]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"notes" => String.duplicate("a", 2001)},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Notes is too long" in errors_on(changeset).custom_data
  end

  test "rejects invalid URL fields" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "website", "label" => "Website", "type" => "url", "required" => true}
          ]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"website" => "not a valid url"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Website must be a valid link (http(s), mailto, domain, or email)" in errors_on(
             changeset
           ).custom_data
  end

  test "rejects invalid select option" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "unknown", "cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Status is not a valid option" in errors_on(changeset).custom_data
  end

  test "rejects invalid list values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "tags", "label" => "Tags", "type" => "list", "required" => true}
          ]
        }
      })

    base_attrs = %{
      "title" => "Arcade",
      "latitude" => 30.0,
      "longitude" => -97.0,
      "pin_type" => "custom:#{pin_type.slug}",
      "user_id" => 1
    }

    not_a_list =
      %Pin{}
      |> Pin.changeset(Map.put(base_attrs, "custom_data", %{"tags" => "one"}))
      |> Validator.validate_custom_data(pin_type)

    assert "Tags must be a list" in errors_on(not_a_list).custom_data

    non_text_items =
      %Pin{}
      |> Pin.changeset(Map.put(base_attrs, "custom_data", %{"tags" => [1, 2]}))
      |> Validator.validate_custom_data(pin_type)

    assert "Tags must be a list of text items" in errors_on(non_text_items).custom_data

    too_many =
      %Pin{}
      |> Pin.changeset(
        Map.put(base_attrs, "custom_data", %{"tags" => Enum.map(1..51, &"tag-#{&1}")})
      )
      |> Validator.validate_custom_data(pin_type)

    assert "Tags has too many items" in errors_on(too_many).custom_data
  end

  test "rejects invalid blob references" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{"key" => "song", "label" => "Song", "type" => "music", "required" => false}
          ]
        }
      })

    base_attrs = %{
      "title" => "Arcade",
      "latitude" => 30.0,
      "longitude" => -97.0,
      "pin_type" => "custom:#{pin_type.slug}",
      "user_id" => 1
    }

    invalid_ref =
      %Pin{}
      |> Pin.changeset(Map.put(base_attrs, "custom_data", %{"song" => 0}))
      |> Validator.validate_custom_data(pin_type)

    assert "Song must be a reference (integer id or %{ref: id})" in errors_on(invalid_ref).custom_data

    invalid_map_ref =
      %Pin{}
      |> Pin.changeset(Map.put(base_attrs, "custom_data", %{"song" => %{"ref" => -1}}))
      |> Validator.validate_custom_data(pin_type)

    assert "Song must be a reference (integer id or %{ref: id})" in errors_on(invalid_map_ref).custom_data
  end

  test "does not require blob fields in custom_data on pin create" do
    import Storymap.PinTypesFixtures

    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [
            %{
              "key" => "status",
              "label" => "Status",
              "type" => "select",
              "required" => true,
              "options" => [
                %{"value" => "working", "label" => "Working"}
              ]
            },
            %{"key" => "song", "label" => "Song", "type" => "music", "required" => true},
            %{"key" => "sketch", "label" => "Sketch", "type" => "drawing", "required" => true}
          ]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "working"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert changeset.valid?
    assert get_field(changeset, :custom_data) == %{"status" => "working"}
  end

  test "rejects unknown custom pin type" do
    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:missing",
        "custom_data" => %{},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(nil)

    assert "references an unknown custom pin type" in errors_on(changeset).pin_type
  end

  test "rejects custom data exceeding JSON size limit" do
    pin_type = custom_pin_type_fixture()

    huge = String.duplicate("x", 20_000)

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "working", "cost" => huge},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "is too large" in errors_on(changeset).custom_data
  end

  test "rejects text field that is too long" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "note", "label" => "Note", "type" => "text"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"note" => String.duplicate("a", 2001)},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Note is too long" in errors_on(changeset).custom_data
  end

  test "rejects non-text text field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "note", "label" => "Note", "type" => "text"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"note" => 123},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Note must be text" in errors_on(changeset).custom_data
  end

  test "rejects invalid URL field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "link", "label" => "Link", "type" => "url"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"link" => "not a valid url!!!"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Link must be a valid link (http(s), mailto, domain, or email)" in errors_on(changeset).custom_data
  end

  test "accepts valid URL field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "link", "label" => "Link", "type" => "url"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"link" => "https://example.com"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert changeset.valid?
  end

  test "rejects non-string select values" do
    pin_type = custom_pin_type_fixture()

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => 1, "cost" => 1},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Status must be a valid option" in errors_on(changeset).custom_data
  end

  test "rejects invalid list field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "tags", "label" => "Tags", "type" => "list"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"tags" => [1, 2]},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Tags must be a list of text items" in errors_on(changeset).custom_data
  end

  test "rejects list with too many items" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "tags", "label" => "Tags", "type" => "list"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"tags" => Enum.map(1..51, &"tag#{&1}")},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Tags has too many items" in errors_on(changeset).custom_data
  end

  test "rejects invalid blob reference" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "song", "label" => "Song", "type" => "music"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"song" => "bad"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Song must be a reference (integer id or %{ref: id})" in errors_on(changeset).custom_data
  end

  test "accepts integer blob reference" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "song", "label" => "Song", "type" => "music"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"song" => 42},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert changeset.valid?
    assert get_field(changeset, :custom_data) == %{"song" => 42}
  end

  test "rejects invalid boolean field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "open", "label" => "Open", "type" => "boolean"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"open" => "yes"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Open must be true or false" in errors_on(changeset).custom_data
  end

  test "rejects invalid number field values" do
    pin_type =
      custom_pin_type_fixture(%{
        "schema" => %{
          "fields" => [%{"key" => "cost", "label" => "Cost", "type" => "number"}]
        }
      })

    changeset =
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"cost" => "free"},
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)

    assert "Cost must be a number" in errors_on(changeset).custom_data
  end

  describe "field type happy paths and atom-key schemas" do
    defp validate(pin_type, custom_data) do
      %Pin{}
      |> Pin.changeset(%{
        "title" => "Arcade",
        "latitude" => 30.0,
        "longitude" => -97.0,
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => custom_data,
        "user_id" => 1
      })
      |> Validator.validate_custom_data(pin_type)
    end

    test "accepts atom-key schema field types" do
      pin_type = %Storymap.PinTypes.CustomPinType{
        slug: "atom-fields",
        schema: %{
          fields: [
            %{key: "note", label: "Note", type: "text"},
            %{key: "bio", label: "Bio", type: "textarea"},
            %{key: "link", label: "Link", type: "url"},
            %{key: "cost", label: "Cost", type: "number"},
            %{key: "open", label: "Open", type: "boolean"},
            %{
              key: "status",
              label: "Status",
              type: "select",
              options: [%{value: "a", label: "A"}]
            },
            %{key: "tags", label: "Tags", type: "list"},
            %{key: "song", label: "Song", type: "music"}
          ]
        }
      }

      changeset =
        validate(pin_type, %{
          "note" => "hello",
          "bio" => "longer text",
          "link" => "https://example.com",
          "cost" => 5,
          "open" => true,
          "status" => "a",
          "tags" => ["one"],
          "song" => 42
        })

      assert changeset.valid?

      assert get_field(changeset, :custom_data) == %{
               "note" => "hello",
               "bio" => "longer text",
               "link" => "https://example.com",
               "cost" => 5,
               "open" => true,
               "status" => "a",
               "tags" => ["one"],
               "song" => 42
             }
    end

    test "rejects non-text for text fields" do
      pin_type = %Storymap.PinTypes.CustomPinType{
        slug: "text-only",
        schema: %{fields: [%{key: "note", label: "Note", type: "text"}]}
      }

      changeset = validate(pin_type, %{"note" => 123})
      assert "Note must be text" in errors_on(changeset).custom_data
    end

    test "rejects list that is not a list" do
      pin_type =
        custom_pin_type_fixture(%{
          "schema" => %{"fields" => [%{"key" => "tags", "label" => "Tags", "type" => "list"}]}
        })

      changeset = validate(pin_type, %{"tags" => "not-a-list"})
      assert "Tags must be a list" in errors_on(changeset).custom_data
    end

    test "accepts drawing ref map with atom ref key" do
      pin_type = %Storymap.PinTypes.CustomPinType{
        slug: "drawing-ref",
        schema: %{fields: [%{key: "sketch", label: "Sketch", type: "drawing"}]}
      }

      changeset = validate(pin_type, %{"sketch" => %{ref: 7}})
      assert changeset.valid?
      assert get_field(changeset, :custom_data) == %{"sketch" => %{ref: 7}}
    end

    test "rejects unknown field type" do
      pin_type = %Storymap.PinTypes.CustomPinType{
        slug: "bad-type",
        schema: %{fields: [%{key: "x", label: "X", type: "widget"}]}
      }

      changeset = validate(pin_type, %{"x" => "y"})
      assert "X has invalid type" in errors_on(changeset).custom_data
    end

    test "strips unknown keys from custom_data" do
      pin_type =
        custom_pin_type_fixture(%{
          "schema" => %{"fields" => [%{"key" => "note", "label" => "Note", "type" => "text"}]}
        })

      changeset = validate(pin_type, %{"note" => "ok", "extra" => "drop me"})
      assert changeset.valid?
      assert get_field(changeset, :custom_data) == %{"note" => "ok"}
    end

    test "treats empty string as missing required field" do
      pin_type =
        custom_pin_type_fixture(%{
          "schema" => %{
            "fields" => [
              %{"key" => "note", "label" => "Note", "type" => "text", "required" => true}
            ]
          }
        })

      changeset = validate(pin_type, %{"note" => ""})
      assert "missing required fields: Note" in errors_on(changeset).custom_data
    end
  end
end
