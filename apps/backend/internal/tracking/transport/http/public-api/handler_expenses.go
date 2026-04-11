package publicapi

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackExpenses(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	expenses, err := handler.tracking.ListExpenses(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ExpensesExpense, 0, len(expenses))
	for _, expense := range expenses {
		response = append(response, expenseViewToAPI(expense))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackExpense(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	payload, err := bindPublicTrackExpensePayload(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	if payload.DateOfExpense == nil {
		today := time.Now().UTC().Format("2006-01-02")
		payload.DateOfExpense = &today
	}
	dateOfExpense, err := parseTrackDate(payload.DateOfExpense)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	expense, err := handler.tracking.CreateExpense(ctx.Request().Context(), trackingapplication.CreateExpenseCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		TimeEntryID:   nil,
		Description:   lo.FromPtr(payload.Description),
		Category:      lo.FromPtr(payload.Category),
		State:         defaultString(payload.State, "draft"),
		Currency:      defaultString(payload.Currency, "USD"),
		TotalAmount:   intValueOrZero(payload.TotalAmount),
		DateOfExpense: dateOfExpense,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, expenseViewToAPI(expense))
}

func expenseViewToAPI(view trackingapplication.ExpenseView) publictrackapi.ExpensesExpense {
	return publictrackapi.ExpensesExpense{
		Category:      lo.ToPtr(view.Category),
		CreatedAt:     timePointer(view.CreatedAt),
		Currency:      lo.ToPtr(view.Currency),
		DateOfExpense: datePointer(view.DateOfExpense),
		DeletedAt:     timePointerValue(view.DeletedAt),
		Description:   lo.ToPtr(view.Description),
		Id:            lo.ToPtr(int(view.ID)),
		State:         lo.ToPtr(view.State),
		TotalAmount:   lo.ToPtr(view.TotalAmount),
		UpdatedAt:     timePointer(view.UpdatedAt),
		UserId:        lo.ToPtr(int(view.UserID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
	}
}

func bindPublicTrackExpensePayload(ctx echo.Context) (publictrackapi.ExpensesExpense, error) {
	contentType := strings.TrimSpace(ctx.Request().Header.Get(echo.HeaderContentType))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if _, err := ctx.FormFile("file"); err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		totalAmount, err := optionalFormIntPointer(ctx, "total_amount")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		userID, err := optionalFormIntPointer(ctx, "user_id")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		workspaceID, err := optionalFormIntPointer(ctx, "workspace_id")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		return publictrackapi.ExpensesExpense{
			Category:      optionalFormStringPointer(ctx, "category"),
			Currency:      optionalFormStringPointer(ctx, "currency"),
			DateOfExpense: optionalFormStringPointer(ctx, "date_of_expense"),
			Description:   optionalFormStringPointer(ctx, "description"),
			State:         optionalFormStringPointer(ctx, "state"),
			TotalAmount:   totalAmount,
			UserId:        userID,
			WorkspaceId:   workspaceID,
		}, nil
	}

	var payload publictrackapi.ExpensesExpense
	if err := ctx.Bind(&payload); err != nil {
		return publictrackapi.ExpensesExpense{}, err
	}
	return payload, nil
}

func optionalFormStringPointer(ctx echo.Context, key string) *string {
	value := strings.TrimSpace(ctx.FormValue(key))
	if value == "" {
		return nil
	}
	return &value
}

func optionalFormIntPointer(ctx echo.Context, key string) (*int, error) {
	value := strings.TrimSpace(ctx.FormValue(key))
	if value == "" {
		return nil, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
