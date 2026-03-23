package application

import (
	"context"
	"errors"
	"time"
)

var (
	ErrRateAmountInvalid       = errors.New("catalog rate amount must be positive")
	ErrRateLevelInvalid        = errors.New("catalog rate level is invalid")
	ErrRateTypeInvalid         = errors.New("catalog rate type is invalid")
	ErrRateModeInvalid         = errors.New("catalog rate mode is invalid")
	ErrRateTargetNotFound      = errors.New("catalog rate target not found")
	ErrRateStartOrModeRequired = errors.New("catalog rate start or mode is required")
)

func (service *Service) CreateRate(ctx context.Context, command CreateRateCommand) (RateView, error) {
	if err := requireWorkspaceID(command.WorkspaceID); err != nil {
		return RateView{}, err
	}
	if command.CreatorID <= 0 || command.LevelID <= 0 {
		return RateView{}, ErrRateTargetNotFound
	}
	if command.Amount <= 0 {
		return RateView{}, ErrRateAmountInvalid
	}
	if !isValidRateLevel(command.Level) {
		return RateView{}, ErrRateLevelInvalid
	}
	if !isValidRateType(command.Type) {
		return RateView{}, ErrRateTypeInvalid
	}

	if err := service.validateRateTarget(ctx, command.WorkspaceID, command.Level, command.LevelID); err != nil {
		return RateView{}, err
	}

	start, mode, err := resolveRateTiming(command.Start, command.Mode)
	if err != nil {
		return RateView{}, err
	}
	command.Start = &start
	command.Mode = &mode

	return service.store.CreateRate(ctx, command)
}

func (service *Service) GetRatesByLevel(
	ctx context.Context,
	workspaceID int64,
	level RateLevel,
	levelID int64,
	rateType RateType,
) ([]RateView, error) {
	if err := requireWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	if levelID <= 0 {
		return nil, ErrRateTargetNotFound
	}
	if !isValidRateLevel(level) {
		return nil, ErrRateLevelInvalid
	}
	if !isValidRateType(rateType) {
		return nil, ErrRateTypeInvalid
	}
	if err := service.validateRateTarget(ctx, workspaceID, level, levelID); err != nil {
		return nil, err
	}
	return service.store.ListRatesByLevel(ctx, workspaceID, level, levelID, rateType)
}

func (service *Service) validateRateTarget(
	ctx context.Context,
	workspaceID int64,
	level RateLevel,
	levelID int64,
) error {
	switch level {
	case RateLevelWorkspace:
		if levelID != workspaceID {
			return ErrRateTargetNotFound
		}
		return nil
	case RateLevelWorkspaceUser:
		ok, err := service.store.GetWorkspaceMemberByID(ctx, workspaceID, levelID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrRateTargetNotFound
		}
		return nil
	case RateLevelProject:
		if _, ok, err := service.store.GetProject(ctx, workspaceID, levelID); err != nil {
			return err
		} else if !ok {
			return ErrProjectNotFound
		}
		return nil
	case RateLevelProjectUser:
		projectID, userID, ok := parseProjectUserRateLevelID(levelID)
		if !ok {
			return ErrRateTargetNotFound
		}
		if _, found, err := service.store.GetProjectUser(ctx, workspaceID, projectID, userID); err != nil {
			return err
		} else if !found {
			return ErrProjectUserNotFound
		}
		return nil
	case RateLevelTask:
		if _, ok, err := service.store.GetTaskByWorkspace(ctx, workspaceID, levelID); err != nil {
			return err
		} else if !ok {
			return ErrTaskNotFound
		}
		return nil
	default:
		return ErrRateLevelInvalid
	}
}

func resolveRateTiming(start *time.Time, mode *RateChangeMode) (time.Time, RateChangeMode, error) {
	if start != nil {
		resolvedMode := RateChangeModeOverrideCurrent
		if mode != nil {
			if !isValidRateMode(*mode) {
				return time.Time{}, "", ErrRateModeInvalid
			}
			resolvedMode = *mode
		}
		return start.UTC(), resolvedMode, nil
	}
	if mode == nil {
		return time.Time{}, "", ErrRateStartOrModeRequired
	}
	if !isValidRateMode(*mode) {
		return time.Time{}, "", ErrRateModeInvalid
	}

	now := time.Now().UTC()
	switch *mode {
	case RateChangeModeOverrideAll, RateChangeModeOverrideCurrent:
		return now, *mode, nil
	case RateChangeModeStartToday:
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC), *mode, nil
	default:
		return time.Time{}, "", ErrRateModeInvalid
	}
}

func isValidRateLevel(level RateLevel) bool {
	switch level {
	case RateLevelWorkspace, RateLevelWorkspaceUser, RateLevelProject, RateLevelProjectUser, RateLevelTask:
		return true
	default:
		return false
	}
}

func isValidRateType(rateType RateType) bool {
	switch rateType {
	case RateTypeBillable, RateTypeLaborCost:
		return true
	default:
		return false
	}
}

func isValidRateMode(mode RateChangeMode) bool {
	switch mode {
	case RateChangeModeOverrideAll, RateChangeModeOverrideCurrent, RateChangeModeStartToday:
		return true
	default:
		return false
	}
}

func parseProjectUserRateLevelID(value int64) (projectID int64, userID int64, ok bool) {
	if value <= 0 {
		return 0, 0, false
	}
	projectID = value / 1000000
	userID = value % 1000000
	if projectID <= 0 || userID <= 0 {
		return 0, 0, false
	}
	return projectID, userID, true
}
