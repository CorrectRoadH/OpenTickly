package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackTags(ctx echo.Context) error {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	workspaceID, err := handler.publicTrackWorkspaceID(ctx)
	if err != nil {
		return err
	}

	views, err := handler.catalog.ListTags(ctx.Request().Context(), workspaceID, catalogapplication.ListTagsFilter{
		Search:  ctx.QueryParam("search"),
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", 200), 200), 1),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	tags := make([]publictrackapi.ModelsTag, 0, len(views))
	for _, view := range views {
		tags = append(tags, tagViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, tags)
}

func (handler *Handler) PostPublicTrackTags(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.catalog.CreateTag(ctx.Request().Context(), catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        lo.FromPtr(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, tagViewToAPI(view))
}

func (handler *Handler) PutPublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.catalog.UpdateTag(ctx.Request().Context(), catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       tagID,
		Name:        request.Name,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, tagViewToAPI(view))
}

func (handler *Handler) DeletePublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteTag(ctx.Request().Context(), workspaceID, tagID); err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

type tagPatchInput struct {
	TagID *int `json:"tag_id"`
	Op    string `json:"op"`
}

func (handler *Handler) PatchPublicTrackTags(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var patches []tagPatchInput
	if err := bindPublicTrackJSON(ctx, &patches, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	tagIDs := make([]int64, 0, len(patches))
	for _, patch := range patches {
		if patch.TagID != nil && patch.Op == "delete" {
			tagIDs = append(tagIDs, int64(*patch.TagID))
		}
	}

	if err := handler.catalog.DeleteTags(ctx.Request().Context(), workspaceID, tagIDs); err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusBadRequest, "Some tag IDs do not belong to workspace").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, "OK")
}

func tagViewToAPI(view catalogapplication.TagView) publictrackapi.ModelsTag {
	return publictrackapi.ModelsTag{
		At:          timePointer(view.CreatedAt),
		CreatorId:   intPointerFromInt64Pointer(view.CreatedBy),
		DeletedAt:   view.DeletedAt,
		Id:          lo.ToPtr(int(view.ID)),
		Name:        lo.ToPtr(view.Name),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}
