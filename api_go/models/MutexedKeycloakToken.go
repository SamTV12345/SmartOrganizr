package models

import (
	"github.com/Nerzal/gocloak/v13"
	"sync"
)

type MutexedKeycloakToken struct {
	Mu  sync.Mutex
	Jwt *gocloak.JWT
}
