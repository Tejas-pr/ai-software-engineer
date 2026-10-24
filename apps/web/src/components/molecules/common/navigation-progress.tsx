import { useNavigation } from "react-router-dom"
import { Progress } from "@workspace/ui/components/progress"

/** A thin amber bar across the top while a lazy page loads */
export function NavigationProgress() {
  const navigation = useNavigation()

  if (navigation.state === "idle") {
    return null
  }

  return (
    <Progress
      data-slot="navigation-progress"
      value={null}
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-50 **:data-[slot=progress-indicator]:bg-primary **:data-[slot=progress-track]:h-0.5 **:data-[slot=progress-track]:rounded-none **:data-[slot=progress-track]:bg-transparent"
    />
  )
}
