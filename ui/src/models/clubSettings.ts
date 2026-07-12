export const visibilityOptions = [
  "leaders-and-authorized",
  "all-members",
  "only-authorized",
  "section",
  "self",
] as const

export type VisibilityOption = (typeof visibilityOptions)[number]
