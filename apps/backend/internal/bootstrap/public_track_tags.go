package bootstrap

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) getPublicTrackTags(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	views, err := runtime.catalogApp.ListTags(ctx.Request().Context(), workspaceID, catalogapplication.ListTagsFilter{
		Search:  ctx.QueryParam("search"),
		Page:    max(queryInt(ctx, "page", 1), 1),
		PerPage: max(min(queryInt(ctx, "per_page", 200), 200), 1),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	tags := make([]publictrackapi.ModelsTag, 0, len(views))
	for _, view := range views {
		tags = append(tags, tagViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, tags)
}

func (runtime *webRuntime) postPublicTrackTags(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := runtime.catalogApp.CreateTag(ctx.Request().Context(), catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsTag{tagViewToAPI(view)})
}

func (runtime *webRuntime) putPublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TagsPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := runtime.catalogApp.UpdateTag(ctx.Request().Context(), catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       tagID,
		Name:        request.Name,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.ModelsTag{tagViewToAPI(view)})
}

func (runtime *webRuntime) deletePublicTrackTag(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	tagID, ok := parsePathID(ctx, "tag_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteTag(ctx.Request().Context(), workspaceID, tagID); err != nil {
		if errors.Is(err, catalogapplication.ErrTagNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
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
		Id:          intPointer(view.ID),
		Name:        stringPointer(view.Name),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}
