import type { CustomFieldPrimitiveType as CustomFieldPrimitiveTypeName } from "../types"

/** Custom pin schema primitive field kinds; match backend `FieldType` values. */
export const CustomFieldPrimitiveType = {
  Text: "text",
  Textarea: "textarea",
  Number: "number",
  Boolean: "boolean",
  Select: "select",
  Url: "url",
  List: "list",
} as const satisfies Record<string, CustomFieldPrimitiveTypeName>

export const CUSTOM_FIELD_PRIMITIVE_TYPES: CustomFieldPrimitiveTypeName[] =
  Object.values(CustomFieldPrimitiveType)

export function isCustomFieldPrimitiveType(type: string): type is CustomFieldPrimitiveTypeName {
  return (CUSTOM_FIELD_PRIMITIVE_TYPES as string[]).includes(type)
}
