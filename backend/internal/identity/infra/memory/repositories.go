package memory

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"opentoggl/backend/backend/internal/identity/application"
	"opentoggl/backend/backend/internal/identity/domain"
)

type UserRepository struct {
	mu         sync.RWMutex
	byID       map[int64]*domain.User
	emailIndex map[string]int64
	tokenIndex map[string]int64
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		byID:       make(map[int64]*domain.User),
		emailIndex: make(map[string]int64),
		tokenIndex: make(map[string]int64),
	}
}

func (repo *UserRepository) Save(_ context.Context, user *domain.User) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	// Copy-on-write keeps failed application flows from mutating the stored user
	// through a shared pointer before Save succeeds.
	if previous, ok := repo.byID[user.ID()]; ok {
		delete(repo.emailIndex, strings.ToLower(previous.Email()))
		if token := previous.APIToken(); token != "" {
			delete(repo.tokenIndex, token)
		}
	}

	stored := cloneUser(user)
	repo.byID[stored.ID()] = stored
	repo.emailIndex[strings.ToLower(stored.Email())] = stored.ID()
	if token := stored.APIToken(); token != "" {
		repo.tokenIndex[token] = stored.ID()
	}
	return nil
}

func (repo *UserRepository) ByID(_ context.Context, id int64) (*domain.User, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	user, ok := repo.byID[id]
	if !ok {
		return nil, fmt.Errorf("user %d not found", id)
	}
	return cloneUser(user), nil
}

func (repo *UserRepository) ByEmail(_ context.Context, email string) (*domain.User, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	id, ok := repo.emailIndex[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return cloneUser(repo.byID[id]), nil
}

func (repo *UserRepository) ByAPIToken(_ context.Context, token string) (*domain.User, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	id, ok := repo.tokenIndex[token]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return cloneUser(repo.byID[id]), nil
}

func cloneUser(user *domain.User) *domain.User {
	if user == nil {
		return nil
	}

	clone := *user
	return &clone
}

type SessionRepository struct {
	mu       sync.RWMutex
	sessions map[string]int64
}

func NewSessionRepository() *SessionRepository {
	return &SessionRepository{
		sessions: make(map[string]int64),
	}
}

func (repo *SessionRepository) Put(_ context.Context, session application.Session) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.sessions[session.ID] = session.UserID
	return nil
}

func (repo *SessionRepository) UserIDBySession(_ context.Context, sessionID string) (int64, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	userID, ok := repo.sessions[sessionID]
	if !ok {
		return 0, application.ErrSessionNotFound
	}
	return userID, nil
}

func (repo *SessionRepository) Delete(_ context.Context, sessionID string) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	delete(repo.sessions, sessionID)
	return nil
}
