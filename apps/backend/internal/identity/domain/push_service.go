package domain

import (
	"errors"
	"strings"
)

var ErrPushServiceTokenRequired = errors.New("push service token is required")

type PushServiceToken string

type PushService struct {
	userID int64
	token  PushServiceToken
}

func NewPushServiceToken(value string) (PushServiceToken, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", ErrPushServiceTokenRequired
	}
	return PushServiceToken(normalized), nil
}

func NewPushService(userID int64, token string) (PushService, error) {
	pushToken, err := NewPushServiceToken(token)
	if err != nil {
		return PushService{}, err
	}
	return PushService{
		userID: userID,
		token:  pushToken,
	}, nil
}

func (pushService PushService) UserID() int64 {
	return pushService.userID
}

func (pushService PushService) Token() PushServiceToken {
	return pushService.token
}

func (token PushServiceToken) String() string {
	return string(token)
}
