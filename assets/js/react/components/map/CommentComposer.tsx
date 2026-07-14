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
        className="w-full rounded border border-base-300 bg-base-100 px-2 py-1.5 text-sm"
        disabled={disabled}
        onFocus={onFocus}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-sm font-medium bg-primary text-primary-content disabled:opacity-50"
          onClick={onSubmit}
          disabled={disabled || value.trim() === ""}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="rounded px-2 py-1 text-sm bg-base-200"
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
