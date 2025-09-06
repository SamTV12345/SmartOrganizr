package reoccuring

import (
	"api_go/db"
	"time"

	"go.uber.org/zap"
)

func ExecuteOncePerHour(db *db.Queries, setupLogger *zap.SugaredLogger) {
	ticker := time.NewTicker(time.Hour)
	quit := make(chan struct{})
	go func() {
		for {
			select {
			case <-ticker.C:
				SyncAllICALFiles(db, setupLogger)
			case <-quit:
				ticker.Stop()
				return
			}
		}
	}()
}
