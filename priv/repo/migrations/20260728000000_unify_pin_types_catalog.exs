defmodule Storymap.Repo.Migrations.UnifyPinTypesCatalog do
  use Ecto.Migration

  @system_types [
    %{
      slug: "one_time",
      label: "One-Time Event",
      description: "A single event or offering at a specific time",
      marker_color: "#f97316",
      icon: "carrot",
      time_mode: "one_time",
      allow_open_24_7: false
    },
    %{
      slug: "scheduled",
      label: "Scheduled",
      description: "Recurring events or hours on a regular schedule",
      marker_color: "#3b82f6",
      icon: "calendar",
      time_mode: "hours",
      allow_open_24_7: false
    },
    %{
      slug: "food_bank",
      label: "Service Location",
      description: "A service location with regular open hours (e.g. food bank or pantry)",
      marker_color: "#22c55e",
      icon: "building",
      time_mode: "hours",
      allow_open_24_7: true
    },
    %{
      slug: "other",
      label: "Other",
      description: "Landmark, point of interest, or place without a schedule",
      marker_color: "#a855f7",
      icon: "star",
      time_mode: "none",
      allow_open_24_7: false
    }
  ]

  def up do
    rename(table(:custom_pin_types), to: table(:pin_types))

    execute("ALTER INDEX IF EXISTS custom_pin_types_slug_index RENAME TO pin_types_slug_index")

    execute(
      "ALTER INDEX IF EXISTS custom_pin_types_enabled_index RENAME TO pin_types_enabled_index"
    )

    execute(
      "ALTER INDEX IF EXISTS custom_pin_types_created_by_user_id_index RENAME TO pin_types_created_by_user_id_index"
    )

    alter table(:pin_types) do
      add :is_system, :boolean, null: false, default: false
      add :allow_open_24_7, :boolean, null: false, default: false
    end

    seed_system_types()

    alter table(:pins) do
      add :pin_type_id, references(:pin_types, on_delete: :restrict), null: true
      add :ad_hoc_fields, :jsonb, null: false, default: fragment("'[]'::jsonb")
    end

    # custom:<slug> → catalog row by slug
    execute("""
    UPDATE pins AS p
    SET pin_type_id = t.id
    FROM pin_types AS t
    WHERE p.pin_type LIKE 'custom:%'
      AND t.slug = substring(p.pin_type FROM 8)
      AND p.pin_type_id IS NULL
    """)

    # bare slug (builtins / any matching catalog slug)
    execute("""
    UPDATE pins AS p
    SET pin_type_id = t.id
    FROM pin_types AS t
    WHERE p.pin_type = t.slug
      AND p.pin_type_id IS NULL
    """)

    guard_unresolved_pins!()

    execute("ALTER TABLE pins ALTER COLUMN pin_type_id SET NOT NULL")

    alter table(:pins) do
      remove :pin_type
    end

    create index(:pins, [:pin_type_id])

    create table(:sub_map_pin_types) do
      add :sub_map_id, references(:sub_maps, on_delete: :delete_all), null: false
      add :pin_type_id, references(:pin_types, on_delete: :delete_all), null: false
    end

    create unique_index(:sub_map_pin_types, [:sub_map_id, :pin_type_id])
    create index(:sub_map_pin_types, [:pin_type_id])

    migrate_allowlists_to_join_table()

    execute("""
    UPDATE sub_maps
    SET settings = settings
      - 'enabled_builtin_pin_types'
      - 'enabled_custom_pin_types'
      - 'allowed_pin_types'
    WHERE settings IS NOT NULL
    """)
  end

  def down do
    execute("DELETE FROM sub_map_pin_types")
    drop_if_exists(index(:sub_map_pin_types, [:pin_type_id]))
    drop_if_exists(unique_index(:sub_map_pin_types, [:sub_map_id, :pin_type_id]))
    drop table(:sub_map_pin_types)

    alter table(:pins) do
      add :pin_type, :string
    end

    # Restore wire strings: system → bare slug; user types → custom:<slug>
    execute("""
    UPDATE pins AS p
    SET pin_type =
      CASE
        WHEN t.is_system THEN t.slug
        ELSE 'custom:' || t.slug
      END
    FROM pin_types AS t
    WHERE p.pin_type_id = t.id
    """)

    execute("ALTER TABLE pins ALTER COLUMN pin_type SET NOT NULL")

    drop_if_exists(index(:pins, [:pin_type_id]))

    alter table(:pins) do
      remove :pin_type_id
      remove :ad_hoc_fields
    end

    execute("DELETE FROM pin_types WHERE is_system = true")

    alter table(:pin_types) do
      remove :is_system
      remove :allow_open_24_7
    end

    execute(
      "ALTER INDEX IF EXISTS pin_types_created_by_user_id_index RENAME TO custom_pin_types_created_by_user_id_index"
    )

    execute(
      "ALTER INDEX IF EXISTS pin_types_enabled_index RENAME TO custom_pin_types_enabled_index"
    )

    execute("ALTER INDEX IF EXISTS pin_types_slug_index RENAME TO custom_pin_types_slug_index")

    rename(table(:pin_types), to: table(:custom_pin_types))
  end

  defp seed_system_types do
    Enum.each(@system_types, fn type ->
      execute("""
      INSERT INTO pin_types (
        slug, label, description, marker_color, icon, schema, time_mode,
        is_system, allow_open_24_7, enabled, created_by_user_id,
        inserted_at, updated_at
      ) VALUES (
        '#{type.slug}',
        '#{escape_sql(type.label)}',
        '#{escape_sql(type.description)}',
        '#{type.marker_color}',
        '#{type.icon}',
        '{"fields": []}'::jsonb,
        '#{type.time_mode}',
        true,
        #{type.allow_open_24_7},
        true,
        NULL,
        NOW() AT TIME ZONE 'utc',
        NOW() AT TIME ZONE 'utc'
      )
      ON CONFLICT (slug) DO NOTHING
      """)
    end)
  end

  defp migrate_allowlists_to_join_table do
    # Builtins from enabled_builtin_pin_types (or legacy allowed_pin_types)
    execute("""
    INSERT INTO sub_map_pin_types (sub_map_id, pin_type_id)
    SELECT DISTINCT sm.id, pt.id
    FROM sub_maps AS sm
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(
        sm.settings->'enabled_builtin_pin_types',
        sm.settings->'allowed_pin_types',
        '[]'::jsonb
      )
    ) AS builtin(slug)
    JOIN pin_types AS pt ON pt.slug = builtin.slug
    ON CONFLICT (sub_map_id, pin_type_id) DO NOTHING
    """)

    # Custom slugs from enabled_custom_pin_types
    execute("""
    INSERT INTO sub_map_pin_types (sub_map_id, pin_type_id)
    SELECT DISTINCT sm.id, pt.id
    FROM sub_maps AS sm
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(sm.settings->'enabled_custom_pin_types', '[]'::jsonb)
    ) AS custom(slug)
    JOIN pin_types AS pt ON pt.slug = custom.slug
    ON CONFLICT (sub_map_id, pin_type_id) DO NOTHING
    """)
  end

  defp guard_unresolved_pins! do
    execute("""
    DO $guard$
    DECLARE
      cnt bigint;
      sample text;
    BEGIN
      SELECT count(*)::bigint INTO cnt FROM pins WHERE pin_type_id IS NULL;
      IF cnt > 0 THEN
        SELECT string_agg(id::text || '=' || quote_literal(pin_type), ', ' ORDER BY id)
        INTO sample
        FROM (SELECT id, pin_type FROM pins WHERE pin_type_id IS NULL ORDER BY id LIMIT 20) AS orphans;

        RAISE EXCEPTION 'UnifyPinTypesCatalog: % pin(s) could not be mapped to pin_types (sample: %). Fix or delete those rows before migrating.', cnt, COALESCE(sample, '');
      END IF;
    END
    $guard$;
    """)
  end

  defp escape_sql(value) when is_binary(value) do
    String.replace(value, "'", "''")
  end
end
