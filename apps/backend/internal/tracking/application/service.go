package application

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
)

type Service struct {
	store   Store
	catalog CatalogQueries
	logger  log.Logger
	now     func() time.Time
}

// contextKeyAuthenticatedUserID is the context key for storing the authenticated user ID.
// The HTTP transport layer sets this value in context before calling service methods.
// Service methods use this to validate authorization.
type contextKeyAuthenticatedUserID struct{}

var authenticatedUserIDKey = contextKeyAuthenticatedUserID{}

// WithAuthenticatedUserID returns a new context with the authenticated user ID set.
// This should be called by the HTTP transport layer before invoking service methods.
func WithAuthenticatedUserID(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, authenticatedUserIDKey, userID)
}

// getAuthenticatedUserID extracts the authenticated user ID from context, if set.
// Returns (userID, true) if set, or (0, false) if not set.
func getAuthenticatedUserID(ctx context.Context) (int64, bool) {
	if userID, ok := ctx.Value(authenticatedUserIDKey).(int64); ok {
		return userID, true
	}
	return 0, false
}

func NewService(store Store, catalog CatalogQueries, logger log.Logger) (*Service, error) {
	switch {
	case store == nil:
		return nil, ErrStoreRequired
	case catalog == nil:
		return nil, ErrCatalogQueriesRequired
	case logger == nil:
		return nil, fmt.Errorf("logger is required")
	default:
		return &Service{
			store:   store,
			catalog: catalog,
			logger:  logger,
			now: func() time.Time {
				return time.Now().UTC()
			},
		}, nil
	}
}

func (service *Service) resolveTrackingReferences(
	ctx context.Context,
	workspaceID int64,
	projectID *int64,
	taskID *int64,
) (*int64, error) {
	if taskID != nil && projectID == nil {
		return nil, fmt.Errorf("%w: task requires project", ErrInvalidTimeRange)
	}

	if projectID == nil {
		return nil, nil
	}

	project, err := service.catalog.GetProject(ctx, workspaceID, *projectID)
	if err != nil {
		return nil, err
	}
	if taskID != nil {
		if _, err := service.catalog.GetTask(ctx, workspaceID, *projectID, *taskID); err != nil {
			return nil, err
		}
	}
	return project.ClientID, nil
}

func requireWorkspaceID(workspaceID int64) error {
	if workspaceID <= 0 {
		return ErrInvalidWorkspace
	}
	return nil
}

func normalizeTimeEntryRange(start time.Time, stop *time.Time, duration *int) (time.Time, *time.Time, int, error) {
	start = start.UTC().Truncate(time.Second)

	switch {
	case stop != nil && duration != nil:
		normalizedStop := stop.UTC().Truncate(time.Second)
		if normalizedStop.Before(start) {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		// Toggl convention: running entries carry duration = -(start unix epoch).
		// When the client sends stop + negative duration to stop a running entry,
		// ignore the negative duration and compute from stop - start.
		if *duration < 0 {
			computed := int(normalizedStop.Sub(start).Seconds())
			return start, &normalizedStop, computed, nil
		}
		expected := int(normalizedStop.Sub(start).Seconds())
		if expected != *duration {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		return start, &normalizedStop, *duration, nil
	case stop != nil:
		normalizedStop := stop.UTC().Truncate(time.Second)
		if normalizedStop.Before(start) {
			return time.Time{}, nil, 0, ErrInvalidTimeRange
		}
		return start, &normalizedStop, int(normalizedStop.Sub(start).Seconds()), nil
	case duration != nil && *duration >= 0:
		normalizedStop := start.Add(time.Duration(*duration) * time.Second)
		return start, &normalizedStop, *duration, nil
	default:
		// Toggl convention: running entry duration = -(start unix epoch).
		// Always compute this from start so clients get the expected value
		// regardless of what the caller provided.
		runningDuration := int(-start.Unix())
		return start, nil, runningDuration, nil
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func normalizePage(value int, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}

func compareDashboardActivityRecency(left DashboardActivityView, right DashboardActivityView) int {
	leftAt := dashboardActivityTimestamp(left)
	rightAt := dashboardActivityTimestamp(right)
	switch {
	case leftAt.After(rightAt):
		return -1
	case leftAt.Before(rightAt):
		return 1
	case left.ID > right.ID:
		return -1
	case left.ID < right.ID:
		return 1
	default:
		return 0
	}
}

func dashboardActivityTimestamp(activity DashboardActivityView) time.Time {
	if activity.Stop != nil {
		return activity.Stop.UTC()
	}
	return time.Unix(0, 0).UTC()
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrTimeEntryNotFound) ||
		errors.Is(err, ErrFavoriteNotFound) ||
		errors.Is(err, ErrGoalNotFound) ||
		errors.Is(err, ErrReminderNotFound) ||
		errors.Is(err, ErrExpenseNotFound)
}
