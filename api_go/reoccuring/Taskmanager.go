package reoccuring

import (
	"api_go/db"
	"go.uber.org/zap"
	"time"
)

func ExecuteOncePerHour(db *db.Queries, setupLogger *zap.SugaredLogger) {
	ticker := time.NewTicker(time.Hour * 24)
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
