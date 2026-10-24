import { Moon, Sun } from "lucide-react"
import {
  ApplicationButton,
  type ApplicationButtonVariantsProps,
} from "@/components/molecules/application/application-button"
import { useTheme } from "@/hooks/common/use-theme"

export function ThemeToggle(
  props: Omit<
    React.ComponentProps<typeof ApplicationButton> &
      ApplicationButtonVariantsProps,
    "onClick" | "children"
  >
) {
  const { toggleTheme } = useTheme()

  return (
    <ApplicationButton
      data-slot="theme-toggle"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      title="Toggle theme (D)"
      onClick={(event) => {
        // The caret pops up from the middle of this button
        const rect = event.currentTarget.getBoundingClientRect()
        toggleTheme({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      }}
      {...props}
    >
      <Sun className="scale-100 rotate-0 transition-transform duration-300 motion-reduce:transition-none dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute scale-0 rotate-90 transition-transform duration-300 motion-reduce:transition-none dark:scale-100 dark:rotate-0" />
    </ApplicationButton>
  )
}
