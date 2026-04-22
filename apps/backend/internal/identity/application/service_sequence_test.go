package application

import (
	"context"
	"errors"
	"testing"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

func TestRegisterReturnsSequenceErrorsWithoutSavingUser(t *testing.T) {
	repo := &sequenceTestUserRepository{}
	service := NewService(Config{
		Users:    repo,
		Sessions: &sequenceTestSessionRepository{},
		IDs: &sequenceTestSequence{
			nextUserIDErr: errors.New("boom user id"),
		},
	})

	_, err := service.Register(context.Background(), RegisterInput{
		Email:    "person@example.com",
		FullName: "Person Example",
		Password: "secret1",
	})
	if err == nil || err.Error() != "boom user id" {
		t.Fatalf("expected next user id error, got %v", err)
	}
	if repo.saveCount != 0 {
		t.Fatalf("expected register to stop before saving user, saveCount=%d", repo.saveCount)
	}
}

func TestLoginBasicReturnsSequenceErrorsWithoutSavingSession(t *testing.T) {
	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:       1,
		Email:    "person@example.com",
		FullName: "Person Example",
		Password: "secret1",
		APIToken: "api-token-1",
	})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	sessions := &sequenceTestSessionRepository{}
	service := NewService(Config{
		Users: &sequenceTestUserRepository{
			byEmail: map[string]*domain.User{
				"person@example.com": user,
			},
		},
		Sessions: sessions,
		IDs: &sequenceTestSequence{
			nextSessionIDErr: errors.New("boom session id"),
		},
	})

	_, err = service.LoginBasic(context.Background(), domain.BasicCredentials{
		Username: "person@example.com",
		Password: "secret1",
	})
	if err == nil || err.Error() != "boom session id" {
		t.Fatalf("expected next session id error, got %v", err)
	}
	if sessions.putCount != 0 {
		t.Fatalf("expected login to stop before saving session, putCount=%d", sessions.putCount)
	}
}

func TestResetAPITokenReturnsSequenceErrorsWithoutSavingUser(t *testing.T) {
	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:       1,
		Email:    "person@example.com",
		FullName: "Person Example",
		Password: "secret1",
		APIToken: "api-token-1",
	})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	repo := &sequenceTestUserRepository{
		byID: map[int64]*domain.User{
			1: user,
		},
	}
	service := NewService(Config{
		Users:    repo,
		Sessions: &sequenceTestSessionRepository{},
		IDs: &sequenceTestSequence{
			nextAPITokenErr: errors.New("boom api token"),
		},
	})

	_, err = service.ResetAPIToken(context.Background(), 1)
	if err == nil || err.Error() != "boom api token" {
		t.Fatalf("expected next api token error, got %v", err)
	}
	if repo.saveCount != 0 {
		t.Fatalf("expected reset api token to stop before saving user, saveCount=%d", repo.saveCount)
	}
}

type sequenceTestUserRepository struct {
	byID               map[int64]*domain.User
	byEmail            map[string]*domain.User
	byToken            map[string]*domain.User
	byProductCode      map[string]*domain.User
	byWeeklyReportCode map[string]*domain.User
	saveCount          int
}

func (repo *sequenceTestUserRepository) Save(_ context.Context, user *domain.User) error {
	repo.saveCount++
	if repo.byID == nil {
		repo.byID = map[int64]*domain.User{}
	}
	if repo.byEmail == nil {
		repo.byEmail = map[string]*domain.User{}
	}
	if repo.byToken == nil {
		repo.byToken = map[string]*domain.User{}
	}
	if repo.byProductCode == nil {
		repo.byProductCode = map[string]*domain.User{}
	}
	if repo.byWeeklyReportCode == nil {
		repo.byWeeklyReportCode = map[string]*domain.User{}
	}
	repo.byID[user.ID()] = user
	repo.byEmail[user.Email()] = user
	repo.byToken[user.APIToken()] = user
	repo.byProductCode[user.ProductEmailsDisableCode()] = user
	repo.byWeeklyReportCode[user.WeeklyReportDisableCode()] = user
	return nil
}

func (repo *sequenceTestUserRepository) ByID(_ context.Context, id int64) (*domain.User, error) {
	user, ok := repo.byID[id]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return user, nil
}

func (repo *sequenceTestUserRepository) ByEmail(_ context.Context, email string) (*domain.User, error) {
	user, ok := repo.byEmail[email]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return user, nil
}

func (repo *sequenceTestUserRepository) ByAPIToken(_ context.Context, token string) (*domain.User, error) {
	user, ok := repo.byToken[token]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return user, nil
}

func (repo *sequenceTestUserRepository) ByProductEmailsDisableCode(_ context.Context, code string) (*domain.User, error) {
	user, ok := repo.byProductCode[code]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return user, nil
}

func (repo *sequenceTestUserRepository) ByWeeklyReportDisableCode(_ context.Context, code string) (*domain.User, error) {
	user, ok := repo.byWeeklyReportCode[code]
	if !ok {
		return nil, domain.ErrInvalidCredentials
	}
	return user, nil
}

type sequenceTestSessionRepository struct {
	putCount int
}

func (repo *sequenceTestSessionRepository) Put(_ context.Context, _ Session) error {
	repo.putCount++
	return nil
}

func (repo *sequenceTestSessionRepository) UserIDBySession(_ context.Context, _ string) (int64, error) {
	return 0, ErrSessionNotFound
}

func (repo *sequenceTestSessionRepository) Delete(_ context.Context, _ string) error {
	return nil
}

func (repo *sequenceTestSessionRepository) DeleteByUserID(_ context.Context, _ int64) error {
	return nil
}

type sequenceTestSequence struct {
	nextUserID       int64
	nextUserIDErr    error
	nextSessionID    string
	nextSessionIDErr error
	nextAPIToken     string
	nextAPITokenErr  error
}

func (sequence *sequenceTestSequence) NextUserID() (int64, error) {
	if sequence.nextUserIDErr != nil {
		return 0, sequence.nextUserIDErr
	}
	if sequence.nextUserID != 0 {
		return sequence.nextUserID, nil
	}
	return 1, nil
}

func (sequence *sequenceTestSequence) NextSessionID() (string, error) {
	if sequence.nextSessionIDErr != nil {
		return "", sequence.nextSessionIDErr
	}
	if sequence.nextSessionID != "" {
		return sequence.nextSessionID, nil
	}
	return "session-1", nil
}

func (sequence *sequenceTestSequence) NextAPIToken() (string, error) {
	if sequence.nextAPITokenErr != nil {
		return "", sequence.nextAPITokenErr
	}
	if sequence.nextAPIToken != "" {
		return sequence.nextAPIToken, nil
	}
	return "api-token-1", nil
}
