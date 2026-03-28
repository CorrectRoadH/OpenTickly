package domain

import "errors"

var (
	ErrInstanceUserNotFound = errors.New("instance user not found")
	ErrCannotDisableSelf    = errors.New("cannot disable your own account")
)
