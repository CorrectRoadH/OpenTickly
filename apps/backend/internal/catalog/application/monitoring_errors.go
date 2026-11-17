package application

// Explicit domain rejections retain original errors and are not service faults.
var telemetryRejectedErrors = []error{
	ErrClientNotFound,
	ErrGroupNotFound,
	ErrGroupNameTaken,
	ErrProjectNotFound,
	ErrProjectGroupNotFound,
	ErrProjectUserNotFound,
	ErrTagNotFound,
	ErrTaskNotFound,
	ErrInvalidWorkspace,
	ErrPermissionDenied,
	ErrBillableEnforced,
	ErrRateAmountInvalid,
	ErrRateLevelInvalid,
	ErrRateTypeInvalid,
	ErrRateModeInvalid,
	ErrRateTargetNotFound,
	ErrRateStartOrModeRequired,
}
