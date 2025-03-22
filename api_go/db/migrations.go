package db

import (
	"context"
	"sync"
	"time"

	"github.com/pressly/goose/v3/database"
)

// Memory implements the database.Store interface using an in-memory store.
type Memory struct {
	tablename  string
	mu         sync.Mutex
	migrations []migration
}

func NewMemory(tablename string) database.Store {
	return &Memory{
		tablename: tablename,
	}
}

type migration struct {
	id        int64
	version   int64
	timestamp time.Time
}

var _ database.Store = &Memory{}

func (m *Memory) Tablename() string {
	return m.tablename
}

func (m *Memory) CreateVersionTable(_ context.Context, _ database.DBTxConn) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.migrations = append(m.migrations, migration{id: 1, version: 0, timestamp: time.Now()})
	return nil
}

func (m *Memory) Insert(_ context.Context, _ database.DBTxConn, req database.InsertRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := m.migrations[len(m.migrations)-1].id
	m.migrations = append(m.migrations, migration{id: id + 1, version: req.Version, timestamp: time.Now()})
	return nil
}

func (m *Memory) Delete(_ context.Context, _ database.DBTxConn, version int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.migrations = m.migrations[:len(m.migrations)-1]
	return nil
}

func (m *Memory) GetMigration(
	_ context.Context,
	_ database.DBTxConn,
	version int64,
) (*database.GetMigrationResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, mig := range m.migrations {
		if mig.version == version {
			return &database.GetMigrationResult{
				Timestamp: mig.timestamp,
				IsApplied: true,
			}, nil
		}
	}
	return nil, database.ErrVersionNotFound
}

func (m *Memory) GetLatestVersion(_ context.Context, _ database.DBTxConn) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.migrations) == 0 {
		return -1, nil
	}
	latest := m.migrations[len(m.migrations)-1].version
	return latest, nil
}

func (m *Memory) ListMigrations(
	_ context.Context,
	_ database.DBTxConn,
) ([]*database.ListMigrationsResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	migrations := make([]*database.ListMigrationsResult, len(m.migrations))
	for i, mig := range m.migrations {
		migrations[len(m.migrations)-1-i] = &database.ListMigrationsResult{
			Version:   mig.version,
			IsApplied: true,
		}
	}
	return migrations, nil
}
