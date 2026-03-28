package application

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"opentoggl/backend/apps/backend/internal/identity/domain"
)

var (
	ErrSessionNotFound          = errors.New("session not found")
	ErrUnknownPreferencesClient = errors.New("unknown client")
	ErrUnknownAlphaFeature      = errors.New("invalid feature code(s)")
	ErrRegistrationClosed       = errors.New("registration is currently closed")
)

const StopRunningTimerJobName = "identity.deactivated.stop_running_timer"

type Config struct {
	Users              UserRepository
	Sessions           SessionRepository
	PushServices       PushServiceRepository
	JobRecorder        JobRecorder
	RunningTimerLookup RunningTimerLookup
	IDs                Sequence
	KnownAlphaFeatures []string
	RegistrationGuard  RegistrationGuard
}

type UserRepository interface {
	Save(context.Context, *domain.User) error
	ByID(context.Context, int64) (*domain.User, error)
	ByEmail(context.Context, string) (*domain.User, error)
	ByAPIToken(context.Context, string) (*domain.User, error)
	ByProductEmailsDisableCode(context.Context, string) (*domain.User, error)
	ByWeeklyReportDisableCode(context.Context, string) (*domain.User, error)
}

type SessionRepository interface {
	Put(context.Context, Session) error
	UserIDBySession(context.Context, string) (int64, error)
	Delete(context.Context, string) error
}

type PushServiceRepository interface {
	ListByUserID(context.Context, int64) ([]domain.PushService, error)
	Save(context.Context, domain.PushService) error
	Delete(context.Context, int64, domain.PushServiceToken) error
}

type JobRecorder interface {
	Record(context.Context, JobRecord) error
	RecordedForUser(context.Context, int64) ([]JobRecord, error)
}

type RunningTimerLookup interface {
	HasRunningTimer(context.Context, int64) (bool, error)
}

type Sequence interface {
	NextUserID() (int64, error)
	NextSessionID() (string, error)
	NextAPIToken() (string, error)
}

// RegistrationGuard checks whether new user registration is allowed.
// When nil, registration is always allowed (backward compatible).
type RegistrationGuard interface {
	CanRegister(ctx context.Context) error
}

type RegisterInput struct {
	Email    string
	FullName string
	Password string
}

type Session struct {
	ID     string
	UserID int64
}

type JobRecord struct {
	Name   string
	UserID int64
}

type UserSnapshot struct {
	ID                       int64
	Email                    string
	FullName                 string
	APIToken                 string
	Timezone                 string
	BeginningOfWeek          int
	CountryID                int64
	DefaultWorkspaceID       int64
	HasPassword              bool
	TwoFactorEnabled         bool
	SendProductEmails        bool
	SendWeeklyReport         bool
	ToSAcceptNeeded          bool
	ProductEmailsDisableCode string
	WeeklyReportDisableCode  string
	IsInstanceAdmin          bool
}

type AuthenticatedSession struct {
	SessionID string
	User      UserSnapshot
}

type Service struct {
	users              UserRepository
	sessions           SessionRepository
	pushServices       PushServiceRepository
	jobRecorder        JobRecorder
	runningTimerLookup RunningTimerLookup
	ids                Sequence
	knownAlphaFeatures map[string]struct{}
	registrationGuard  RegistrationGuard
}

func NewService(cfg Config) *Service {
	knownAlphaFeatures := make(map[string]struct{}, len(cfg.KnownAlphaFeatures))
	for _, code := range cfg.KnownAlphaFeatures {
		knownAlphaFeatures[code] = struct{}{}
	}

	return &Service{
		users:              cfg.Users,
		sessions:           cfg.Sessions,
		pushServices:       cfg.PushServices,
		jobRecorder:        cfg.JobRecorder,
		runningTimerLookup: cfg.RunningTimerLookup,
		ids:                cfg.IDs,
		knownAlphaFeatures: knownAlphaFeatures,
		registrationGuard:  cfg.RegistrationGuard,
	}
}

func (service *Service) ListPushServices(ctx context.Context, userID int64) ([]domain.PushService, error) {
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return nil, err
	}
	if service.pushServices == nil {
		return []domain.PushService{}, nil
	}
	return service.pushServices.ListByUserID(ctx, userID)
}

func (service *Service) RegisterPushService(ctx context.Context, userID int64, token string) (domain.PushService, error) {
	pushService, err := domain.NewPushService(userID, token)
	if err != nil {
		return domain.PushService{}, err
	}
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return domain.PushService{}, err
	}
	if service.pushServices == nil {
		return pushService, nil
	}
	return pushService, service.pushServices.Save(ctx, pushService)
}

func (service *Service) DeletePushService(ctx context.Context, userID int64, token string) error {
	pushToken, err := domain.NewPushServiceToken(token)
	if err != nil {
		return err
	}
	if _, err := service.users.ByID(ctx, userID); err != nil {
		return err
	}
	if service.pushServices == nil {
		return nil
	}
	return service.pushServices.Delete(ctx, userID, pushToken)
}

func (service *Service) Register(ctx context.Context, input RegisterInput) (AuthenticatedSession, error) {
	if service.registrationGuard != nil {
		if err := service.registrationGuard.CanRegister(ctx); err != nil {
			return AuthenticatedSession{}, err
		}
	}

	userID, err := service.ids.NextUserID()
	if err != nil {
		return AuthenticatedSession{}, err
	}
	apiToken, err := service.ids.NextAPIToken()
	if err != nil {
		return AuthenticatedSession{}, err
	}

	user, err := domain.RegisterUser(domain.RegisterParams{
		ID:       userID,
		Email:    input.Email,
		FullName: input.FullName,
		Password: input.Password,
		APIToken: apiToken,
	})
	if err != nil {
		return AuthenticatedSession{}, err
	}

	if err := service.users.Save(ctx, user); err != nil {
		return AuthenticatedSession{}, err
	}

	return service.issueSession(ctx, user)
}

func (service *Service) LoginBasic(ctx context.Context, credentials domain.BasicCredentials) (AuthenticatedSession, error) {
	user, err := service.userForBasicCredentials(ctx, credentials)
	if err != nil {
		return AuthenticatedSession{}, err
	}

	if err := user.AuthenticateBasic(credentials); err != nil {
		return AuthenticatedSession{}, err
	}

	return service.issueSession(ctx, user)
}

func (service *Service) ResolveBasicUser(ctx context.Context, credentials domain.BasicCredentials) (UserSnapshot, error) {
	user, err := service.userForBasicCredentials(ctx, credentials)
	if err != nil {
		return UserSnapshot{}, err
	}
	if err := user.AuthenticateBasic(credentials); err != nil {
		return UserSnapshot{}, err
	}

	return snapshotFromUser(user), nil
}

func (service *Service) ResolveCurrentUser(ctx context.Context, sessionID string) (UserSnapshot, error) {
	userID, err := service.sessions.UserIDBySession(ctx, sessionID)
	if err != nil {
		return UserSnapshot{}, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return UserSnapshot{}, err
	}
	if !user.CanAuthenticate() {
		return UserSnapshot{}, user.AuthenticateBasic(domain.BasicCredentials{})
	}

	return snapshotFromUser(user), nil
}

func (service *Service) Logout(ctx context.Context, sessionID string) error {
	return service.sessions.Delete(ctx, sessionID)
}

func (service *Service) CreateDesktopLoginToken(ctx context.Context, userID int64) (string, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if !user.CanAuthenticate() {
		return "", user.AuthenticateBasic(domain.BasicCredentials{})
	}

	authenticated, err := service.issueSession(ctx, user)
	if err != nil {
		return "", err
	}
	return authenticated.SessionID, nil
}

func (service *Service) UpdateProfile(ctx context.Context, userID int64, update domain.ProfileUpdate) (UserSnapshot, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return UserSnapshot{}, err
	}
	if err := user.UpdateProfile(update); err != nil {
		return UserSnapshot{}, err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return UserSnapshot{}, err
	}

	return snapshotFromUser(user), nil
}

func (service *Service) GetPreferences(ctx context.Context, userID int64, client string) (domain.Preferences, error) {
	if err := validatePreferencesClient(client); err != nil {
		return domain.Preferences{}, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return domain.Preferences{}, err
	}

	return user.Preferences(), nil
}

func (service *Service) UpdatePreferences(ctx context.Context, userID int64, client string, preferences domain.Preferences) error {
	if err := validatePreferencesClient(client); err != nil {
		return err
	}
	if err := service.validateAlphaFeatures(preferences); err != nil {
		return err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := user.UpdatePreferences(preferences); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) ListAlphaFeatures(ctx context.Context, userID int64, client string) ([]domain.AlphaFeature, error) {
	if err := validatePreferencesClient(client); err != nil {
		return nil, err
	}

	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	enabled := make(map[string]bool, len(user.Preferences().AlphaFeatures))
	for _, feature := range user.Preferences().AlphaFeatures {
		enabled[feature.Code] = feature.Enabled
	}

	codes := make([]string, 0, len(service.knownAlphaFeatures))
	for code := range service.knownAlphaFeatures {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	features := make([]domain.AlphaFeature, 0, len(codes))
	for _, code := range codes {
		features = append(features, domain.AlphaFeature{
			Code:    code,
			Enabled: enabled[code],
		})
	}
	return features, nil
}

func (service *Service) ResetAPIToken(ctx context.Context, userID int64) (string, error) {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return "", err
	}

	token, err := service.ids.NextAPIToken()
	if err != nil {
		return "", err
	}
	if err := user.RotateAPIToken(token); err != nil {
		return "", err
	}
	if err := service.users.Save(ctx, user); err != nil {
		return "", err
	}

	return token, nil
}

func (service *Service) AcceptTOS(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := user.AcceptTermsOfService(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) DisableProductEmailsByCode(ctx context.Context, disableCode string) error {
	user, err := service.users.ByProductEmailsDisableCode(ctx, disableCode)
	if err != nil {
		return err
	}
	if err := user.DisableProductEmails(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) DisableWeeklyReportByCode(ctx context.Context, weeklyReportCode string) error {
	user, err := service.users.ByWeeklyReportDisableCode(ctx, weeklyReportCode)
	if err != nil {
		return err
	}
	if err := user.DisableWeeklyReport(); err != nil {
		return err
	}
	return service.users.Save(ctx, user)
}

func (service *Service) Deactivate(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	rollback := *user
	if err := user.Deactivate(); err != nil {
		return err
	}

	// Identity only records the required side effect boundary here. Tracking owns
	// the actual timer stop behavior and can consume the job later.
	running := false
	if service.runningTimerLookup != nil {
		running, err = service.runningTimerLookup.HasRunningTimer(ctx, userID)
		if err != nil {
			return err
		}
	}

	// Persist the state change first, then roll it back if the job handoff fails.
	// With copy-on-write repositories this keeps deactivation and handoff atomic in
	// the current module tests instead of leaking a deactivated user on failure.
	if err := service.users.Save(ctx, user); err != nil {
		return err
	}

	if running && service.jobRecorder != nil {
		if err := service.jobRecorder.Record(ctx, JobRecord{
			Name:   StopRunningTimerJobName,
			UserID: userID,
		}); err != nil {
			if rollbackErr := service.users.Save(ctx, &rollback); rollbackErr != nil {
				return errors.Join(err, rollbackErr)
			}
			return err
		}
	}

	return nil
}

func (service *Service) AuthorizeBusinessWrite(ctx context.Context, userID int64) error {
	user, err := service.users.ByID(ctx, userID)
	if err != nil {
		return err
	}
	if !user.CanWriteBusinessData() {
		return user.AuthenticateBasic(domain.BasicCredentials{})
	}

	return nil
}

func (service *Service) issueSession(ctx context.Context, user *domain.User) (AuthenticatedSession, error) {
	sessionID, err := service.ids.NextSessionID()
	if err != nil {
		return AuthenticatedSession{}, err
	}
	if err := service.sessions.Put(ctx, Session{
		ID:     sessionID,
		UserID: user.ID(),
	}); err != nil {
		return AuthenticatedSession{}, err
	}

	return AuthenticatedSession{
		SessionID: sessionID,
		User:      snapshotFromUser(user),
	}, nil
}

func (service *Service) userForBasicCredentials(ctx context.Context, credentials domain.BasicCredentials) (*domain.User, error) {
	if credentials.Password == "api_token" {
		return service.users.ByAPIToken(ctx, credentials.Username)
	}
	return service.users.ByEmail(ctx, credentials.Username)
}

func (service *Service) validateAlphaFeatures(preferences domain.Preferences) error {
	if len(service.knownAlphaFeatures) == 0 {
		return nil
	}

	for _, feature := range preferences.AlphaFeatures {
		if _, ok := service.knownAlphaFeatures[feature.Code]; !ok {
			return fmt.Errorf("%w: %s", ErrUnknownAlphaFeature, feature.Code)
		}
	}

	return nil
}

func validatePreferencesClient(client string) error {
	switch client {
	case "", "web", "desktop":
		return nil
	default:
		return ErrUnknownPreferencesClient
	}
}

func snapshotFromUser(user *domain.User) UserSnapshot {
	return UserSnapshot{
		ID:                       user.ID(),
		Email:                    user.Email(),
		FullName:                 user.FullName(),
		APIToken:                 user.APIToken(),
		Timezone:                 user.Timezone(),
		BeginningOfWeek:          user.BeginningOfWeek(),
		CountryID:                user.CountryID(),
		DefaultWorkspaceID:       user.DefaultWorkspaceID(),
		HasPassword:              user.HasPassword(),
		TwoFactorEnabled:         false,
		SendProductEmails:        user.SendProductEmails(),
		SendWeeklyReport:         user.SendWeeklyReport(),
		ToSAcceptNeeded:          user.ToSAcceptNeeded(),
		ProductEmailsDisableCode: user.ProductEmailsDisableCode(),
		WeeklyReportDisableCode:  user.WeeklyReportDisableCode(),
		IsInstanceAdmin:          user.IsInstanceAdmin(),
	}
}
