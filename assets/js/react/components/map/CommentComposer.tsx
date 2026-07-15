import React from "react"

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
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={onSubmit}
          disabled={disabled || value.trim() === ""}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}
