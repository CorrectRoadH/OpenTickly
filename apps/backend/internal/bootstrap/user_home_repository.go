package bootstrap

import "context"

type userHomeRepository interface {
	FindByUserID(context.Context, int64) (organizationID int64, workspaceID int64, found bool, err error)
	Save(context.Context, int64, int64, int64) error
}
