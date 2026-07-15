import React from "react"
import { CLOSE_BTN_CLASS, CLOSE_BTN_SQUARE_CLASS, CLOSE_ICON_CLASS } from "../../utils/actionUiClasses"
import { CloseIcon } from "./icons"

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  /** Required accessible name, e.g. "Close welcome dialog". */
  "aria-label": string
  /** Use square shape in dense headers (e.g. filters). */
  square?: boolean
  className?: string
}

export default function CloseButton({
  square = false,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[square ? CLOSE_BTN_SQUARE_CLASS : CLOSE_BTN_CLASS, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <CloseIcon className={CLOSE_ICON_CLASS} size={16} />
    </button>
  )
}
