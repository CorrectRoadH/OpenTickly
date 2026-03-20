package domain

import (
	"fmt"
	"strconv"
)

type OrganizationID int64

func NewOrganizationID(value int64) (OrganizationID, error) {
	if value <= 0 {
		return 0, fmt.Errorf("organization id must be positive")
	}
	return OrganizationID(value), nil
}

func (id OrganizationID) String() string {
	return strconv.FormatInt(int64(id), 10)
}
