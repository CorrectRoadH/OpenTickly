package application

// Explicit domain rejections retain original errors and are not service faults.
var telemetryRejectedErrors = []error{
	ErrExportNotFound,
	ErrObjectsRequired,
	ErrInvalidScopeID,
	ErrImportArchiveRequired,
	ErrImportArchiveInvalid,
	ErrImportJobNotFound,
	ErrImportSourceInvalid,
}
