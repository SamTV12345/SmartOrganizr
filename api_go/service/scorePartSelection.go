package service

// ScorePartInfo is the part metadata the selection needs.
type ScorePartInfo struct {
	ID        string
	Name      string
	SectionID string // empty = not tied to a section (e.g. "Direktion")
}

// ScorePartSelection is the outcome for one member and one score.
type ScorePartSelection struct {
	// PartID is the part the member plays; empty when nothing fits automatically.
	PartID string
	// Options are all parts of the score, the member's own section first, so
	// the player can offer a switch (e.g. 1. ↔ 2. Klarinette).
	Options []ScorePartOption
}

type ScorePartOption struct {
	ID         string
	Name       string
	OwnSection bool
}

// SelectScorePart picks the part a member plays for a score:
//  1. the member's remembered choice, if that part still exists;
//  2. otherwise the first part of the member's own section;
//  3. otherwise nothing — parts without a section (score, Direktion) are never
//     handed out automatically, but stay selectable.
//
// parts must be in display order.
func SelectScorePart(parts []ScorePartInfo, memberSectionID, chosenPartID string) ScorePartSelection {
	var own, other []ScorePartOption
	exists := false
	for _, p := range parts {
		isOwn := memberSectionID != "" && p.SectionID == memberSectionID
		opt := ScorePartOption{ID: p.ID, Name: p.Name, OwnSection: isOwn}
		if isOwn {
			own = append(own, opt)
		} else {
			other = append(other, opt)
		}
		if p.ID == chosenPartID && chosenPartID != "" {
			exists = true
		}
	}
	sel := ScorePartSelection{Options: append(own, other...)}
	switch {
	case exists:
		sel.PartID = chosenPartID
	case len(own) > 0:
		sel.PartID = own[0].ID
	}
	return sel
}
