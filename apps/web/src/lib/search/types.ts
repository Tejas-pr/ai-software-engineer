import { z } from "zod"

export const SEARCH_GROUPS = [
  "Actions",
  "Pages",
  "Repositories",
  "Runs",
] as const

export const searchGroupSchema = z.enum(SEARCH_GROUPS)
export type SearchGroup = z.infer<typeof searchGroupSchema>

export const SEARCH_COMMANDS = [
  "theme.light",
  "theme.dark",
  "theme.system",
  "sidebar.toggle",
  "auth.signout",
  "project.new",
  "org.new",
] as const

export const searchCommandSchema = z.enum(SEARCH_COMMANDS)
export type SearchCommand = z.infer<typeof searchCommandSchema>

const searchItemBaseSchema = z.object({
  id: z.string().min(1).max(200),
  group: searchGroupSchema,
  label: z.string().min(1).max(200),
  hint: z.string().max(200).optional(),
  keywords: z.array(z.string()).default([]),
})

export const searchItemSchema = z.union([
  searchItemBaseSchema.extend({
    path: z.string().regex(/^\/(?!\/)/),
  }),
  searchItemBaseSchema.extend({
    command: searchCommandSchema,
  }),
])

export type SearchItem = z.infer<typeof searchItemSchema>

export const searchRecentsSchema = z.array(searchItemSchema).max(10)
