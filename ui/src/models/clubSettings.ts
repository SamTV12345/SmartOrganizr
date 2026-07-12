export const visibilityOptions = [
  "leaders-and-authorized",
  "all-members",
  "only-authorized",
  "self",
] as const

export type VisibilityOption = (typeof visibilityOptions)[number]
