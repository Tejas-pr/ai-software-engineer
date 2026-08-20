import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { getUser } from "./api/user.api"

interface User {
  id: string
  username: string
  email: string
  is_superuser: boolean
  is_marketplace_admin: boolean
}

export function App() {
  const [data, setData] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUser()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Failed to load user")
        setLoading(false)
      })
  }, [])

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {loading && <span>Loading user...</span>}
          {error && <span className="text-red-500">Error: {error}</span>}
          {data && <span>User: {JSON.stringify(data)}</span>}
        </div>
      </div>
    </div>
  )
}
