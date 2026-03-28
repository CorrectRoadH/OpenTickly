package application

const projectUserIDMultiplier int64 = 1_000_000

// EncodeProjectUserID encodes a project ID and user ID into a single synthetic ID
// used by the Toggl Track API for project user identification.
func EncodeProjectUserID(projectID, userID int64) int64 {
	return projectID*projectUserIDMultiplier + userID
}

// DecodeProjectUserID decodes a synthetic project user ID into its component
// project ID and user ID.
func DecodeProjectUserID(value int64) (projectID, userID int64, ok bool) {
	if value <= 0 {
		return 0, 0, false
	}
	projectID = value / projectUserIDMultiplier
	userID = value % projectUserIDMultiplier
	if projectID <= 0 || userID <= 0 {
		return 0, 0, false
	}
	return projectID, userID, true
}
