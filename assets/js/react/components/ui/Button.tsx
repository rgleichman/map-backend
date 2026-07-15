import React, { forwardRef } from "react"
import {
  actionBtnClass,
  type ActionBtnSize,
  type ActionBtnVariant,
} from "../../utils/actionUiClasses"

export type ButtonProps = {
  variant?: ActionBtnVariant
  size?: ActionBtnSize
  className?: string
  children: React.ReactNode
  /** When set, renders an anchor instead of a button. */
  href?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href" | "type">

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, children, href, type, ...rest },
    ref,
  ) {
    const classes = actionBtnClass(variant, size, className)

    if (href != null) {
      return (
        <a
          href={href}
          className={classes}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      )
    }

    return (
      <button
        type={type ?? "button"}
        className={classes}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    )
  },
)

export default Button
