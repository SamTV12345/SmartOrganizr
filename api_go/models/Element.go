package models

type ElementName string

const (
	FOLDER ElementName = "FOLDER"
	NOTE   ElementName = "NOTE"
)

type Element interface {
	Type() ElementName
	String() string
}
