import { describe, expect, it, beforeEach } from "vitest"
import {
  readSearchRecents,
  saveSearchRecent,
  MAX_RECENTS,
} from "./search-recents"
import type { SearchItem } from "./types"

describe("search-recents", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("returns an empty array when no recents are stored", () => {
    expect(readSearchRecents()).toEqual([])
  })

  it("saves and retrieves recent items in newest-first order", () => {
    const item1: SearchItem = {
      id: "Pages:projects",
      group: "Pages",
      label: "Repositories",
      path: "/projects",
      keywords: ["repos"],
    }
    const item2: SearchItem = {
      id: "Actions:theme.dark",
      group: "Actions",
      label: "Switch to dark mode",
      command: "theme.dark",
      keywords: ["dark"],
    }

    saveSearchRecent(item1)
    saveSearchRecent(item2)

    const recents = readSearchRecents()
    expect(recents).toHaveLength(2)
    expect(recents[0].id).toBe("Actions:theme.dark")
    expect(recents[1].id).toBe("Pages:projects")
  })

  it("deduplicates already saved items and bumps to the front", () => {
    const item1: SearchItem = {
      id: "Pages:projects",
      group: "Pages",
      label: "Repositories",
      path: "/projects",
      keywords: ["repos"],
    }
    const item2: SearchItem = {
      id: "Pages:runs",
      group: "Pages",
      label: "Runs",
      path: "/runs",
      keywords: ["runs"],
    }

    saveSearchRecent(item1)
    saveSearchRecent(item2)
    saveSearchRecent(item1)

    const recents = readSearchRecents()
    expect(recents).toHaveLength(2)
    expect(recents[0].id).toBe("Pages:projects")
    expect(recents[1].id).toBe("Pages:runs")
  })

  it("caps recents at MAX_RECENTS", () => {
    for (let i = 0; i < 10; i++) {
      saveSearchRecent({
        id: `Pages:${i}`,
        group: "Pages",
        label: `Page ${i}`,
        path: `/page-${i}`,
        keywords: [],
      })
    }

    const recents = readSearchRecents()
    expect(recents).toHaveLength(MAX_RECENTS)
    expect(recents[0].id).toBe("Pages:9")
  })
})
