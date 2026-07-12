export type ClubEventResponseStatus = "YES" | "NO" | "MAYBE" | ""

export type ClubEventModel = {
  id: string
  clubId: string
  clubName?: string
  summary: string
  description: string
  location: string
  geoDateX?: number | null
  geoDateY?: number | null
  eventType: "REHEARSAL" | "CONCERT" | "OTHER"
  startDate: string
  endDate: string
  cancelled: boolean
  sectionId?: string
  sectionName?: string
  myStatus: ClubEventResponseStatus
  myReason: string
  yesCount: number
  noCount: number
  maybeCount: number
  undecidedCount: number
}
