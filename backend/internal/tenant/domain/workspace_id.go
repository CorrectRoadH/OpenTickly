package domain

import (
	"fmt"
	"strconv"
)

// WorkspaceID is a minimal value object so Wave 0 has one real domain package
// under test without leaking transport or storage concerns into the module.
type WorkspaceID int64

func NewWorkspaceID(value int64) (WorkspaceID, error) {
	if value <= 0 {
		return 0, fmt.Errorf("workspace id must be positive")
	}
	return WorkspaceID(value), nil
}

func (id WorkspaceID) String() string {
	return strconv.FormatInt(int64(id), 10)
}
