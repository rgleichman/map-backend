import React from "react"
import Button from "../ui/Button"

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  placeholder?: string
  disabled?: boolean
  onCancel?: () => void
  onFocus?: () => void
  className?: string
}

export default function CommentComposer({
  value,
  onChange,
  onSubmit,
  submitLabel,
  placeholder,
  disabled = false,
  onCancel,
  onFocus,
  className,
}: Props) {
  return (
    <div className={className ?? "space-y-2"}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full textarea textarea-bordered textarea-sm"
        disabled={disabled}
        onFocus={onFocus}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSubmit}
          disabled={disabled || value.trim() === ""}
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
