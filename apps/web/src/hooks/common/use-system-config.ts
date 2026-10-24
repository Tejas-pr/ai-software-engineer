import { useEffect, useState } from "react"
import { getSystemConfig, type SystemConfig } from "@/api/system.api"

let cachedConfig: SystemConfig | null = null

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(() => {
    if (cachedConfig) return cachedConfig
    const envFlag = import.meta.env.VITE_RESTRICT_CLONE_RUN_PROJECT === "true"
    if (envFlag) {
      return {
        restrict_clone_run_project: true,
        environment: "production",
      }
    }
    return null
  })

  useEffect(() => {
    let active = true
    getSystemConfig()
      .then((cfg) => {
        if (!active) return
        cachedConfig = cfg
        setConfig(cfg)
      })
      .catch(() => {
        // Fall back to environment variable if endpoint unreachable
        if (!active) return
        const envFlag =
          import.meta.env.VITE_RESTRICT_CLONE_RUN_PROJECT === "true"
        if (envFlag) {
          const fallback = {
            restrict_clone_run_project: true,
            environment: "production",
          }
          cachedConfig = fallback
          setConfig(fallback)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const isRestricted = Boolean(config?.restrict_clone_run_project)

  return {
    config,
    isRestricted,
  }
}

