package application

// Explicit domain rejections retain original errors and are not service faults.
var telemetryRejectedErrors = []error{
	ErrInvalidWorkspace,
	ErrTimeEntryNotFound,
	ErrRunningTimeEntryExists,
	ErrFavoriteNotFound,
	ErrGoalNotFound,
	ErrReminderNotFound,
	ErrExpenseNotFound,
	ErrInvalidTimeRange,
	ErrReportLocked,
	ErrRequiredFieldMissing,
}
