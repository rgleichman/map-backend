import { ChevronDownIcon } from "./ui/icons"
import { CLOSE_BTN_SQUARE_CLASS, CLOSE_ICON_CLASS } from "../utils/actionUiClasses"
import { discoveryRailToggleLabel } from "../utils/gardenCopy"

type Props = {
  titleId: string
  title: string
  listId: string
  minimized: boolean
  onToggle: () => void
}

/** Title row for a desktop discovery list, with a control to collapse the rows. */
export default function DiscoveryRailHeader({
  titleId,
  title,
  listId,
  minimized,
  onToggle,
}: Props) {
  return (
    <header
      className={[
        "flex shrink-0 items-center py-2",
        minimized ? "gap-0.5 pl-3 pr-1" : "gap-2 border-b border-base-300 px-3",
      ].join(" ")}
    >
      <h2
        id={titleId}
        className={[
          "truncate text-sm font-semibold text-base-content",
          minimized ? "shrink-0" : "min-w-0 flex-1 px-1",
        ].join(" ")}
      >
        {title}
      </h2>
      <button
        type="button"
        className={CLOSE_BTN_SQUARE_CLASS}
        aria-expanded={!minimized}
        aria-controls={minimized ? undefined : listId}
        aria-label={discoveryRailToggleLabel(title, minimized)}
        onClick={onToggle}
      >
        <ChevronDownIcon
          className={[CLOSE_ICON_CLASS, "transition-transform", minimized ? "" : "rotate-180"].join(" ")}
          size={16}
        />
      </button>
    </header>
  )
}
