package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// GetWorkspaceInvoices returns invoices for a workspace.
func (handler *Handler) GetWorkspaceInvoices(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	invoices, err := handler.invoices.ListInvoices(
		ctx.Request().Context(),
		workspaceID,
		billingapplication.ListInvoicesFilter{},
	)
	if err != nil {
		return writeInvoiceError(err)
	}

	response := make([]publictrackapi.ModelsUserInvoice, 0, len(invoices))
	for _, invoice := range invoices {
		response = append(response, invoiceViewToAPI(invoice))
	}
	return ctx.JSON(http.StatusOK, response)
}

// PostWorkspaceUserInvoice creates a user invoice for a workspace.
func (handler *Handler) PostWorkspaceUserInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var payload publictrackapi.ModelsUserInvoice
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	invoiceDate, err := parseInvoiceDate(payload.Date)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	dueDate, err := parseOptionalInvoiceDate(payload.DueDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	items := make([]billingapplication.CreateInvoiceItemInput, 0)
	if payload.Items != nil {
		for _, item := range *payload.Items {
			items = append(items, billingapplication.CreateInvoiceItemInput{
				Description: lo.FromPtr(item.Description),
				Quantity:    float64(lo.FromPtr(item.Quantity)),
				Amount:      float64(lo.FromPtr(item.Amount)),
			})
		}
	}

	taxes := make([]billingapplication.CreateInvoiceTaxInput, 0)
	if payload.Taxes != nil {
		for _, tax := range *payload.Taxes {
			taxes = append(taxes, billingapplication.CreateInvoiceTaxInput{
				Name:   lo.FromPtr(tax.Name),
				Amount: float64(lo.FromPtr(tax.Amount)),
			})
		}
	}

	invoice, err := handler.invoices.CreateInvoice(ctx.Request().Context(), billingapplication.CreateInvoiceCommand{
		WorkspaceID:      workspaceID,
		UserID:           user.ID,
		DocumentID:       lo.FromPtr(payload.DocumentId),
		BillingAddress:   lo.FromPtr(payload.BillingAddress),
		WorkspaceAddress: lo.FromPtr(payload.WorkspaceAddress),
		Currency:         lo.FromPtr(payload.Currency),
		Date:             invoiceDate,
		DueDate:          dueDate,
		Message:          lo.FromPtr(payload.Message),
		PaymentTerms:     lo.FromPtr(payload.PaymentTerms),
		PurchaseNumber:   lo.FromPtr(payload.PurchaseNumber),
		Items:            items,
		Taxes:            taxes,
	})
	if err != nil {
		return writeInvoiceError(err)
	}
	return ctx.JSON(http.StatusOK, invoiceViewToAPI(invoice))
}

// GetWorkspaceInvoice returns a single invoice for a workspace.
func (handler *Handler) GetWorkspaceInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	invoiceID, ok := parsePathID(ctx, "user_invoice_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	invoice, err := handler.invoices.GetInvoice(ctx.Request().Context(), workspaceID, invoiceID)
	if err != nil {
		return writeInvoiceError(err)
	}
	return ctx.JSON(http.StatusOK, invoiceViewToAPI(invoice))
}

// DeleteWorkspaceInvoice deletes a workspace invoice.
func (handler *Handler) DeleteWorkspaceInvoice(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	invoiceID, ok := parsePathID(ctx, "user_invoice_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := handler.invoices.DeleteInvoice(ctx.Request().Context(), workspaceID, invoiceID); err != nil {
		return writeInvoiceError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

// GetWorkspacePurchaseOrderPdf returns a purchase order PDF for a workspace.
func (handler *Handler) GetWorkspacePurchaseOrderPdf(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// GetWorkspacePaymentReceipts returns payment receipts for a workspace.
func (handler *Handler) GetWorkspacePaymentReceipts(ctx echo.Context) error {
	workspaceID, err := strconv.ParseInt(ctx.Param("workspace_id"), 10, 64)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func invoiceViewToAPI(view billingapplication.InvoiceView) publictrackapi.ModelsUserInvoice {
	items := make([]publictrackapi.ModelsUserInvoiceItem, 0, len(view.Items))
	for _, item := range view.Items {
		items = append(items, publictrackapi.ModelsUserInvoiceItem{
			Amount:      lo.ToPtr(float32(item.Amount)),
			Description: lo.ToPtr(item.Description),
			ItemId:      lo.ToPtr(int(item.ID)),
			Quantity:    lo.ToPtr(float32(item.Quantity)),
		})
	}

	taxes := make([]publictrackapi.ModelsUserInvoiceTax, 0, len(view.Taxes))
	for _, tax := range view.Taxes {
		taxes = append(taxes, publictrackapi.ModelsUserInvoiceTax{
			Amount: lo.ToPtr(float32(tax.Amount)),
			Name:   lo.ToPtr(tax.Name),
			TaxId:  lo.ToPtr(int(tax.ID)),
		})
	}

	dateStr := view.Date.UTC().Format("2006-01-02")
	var dueDateStr *string
	if view.DueDate != nil {
		formatted := view.DueDate.UTC().Format("2006-01-02")
		dueDateStr = &formatted
	}

	var deletedAtStr *string
	if view.DeletedAt != nil {
		formatted := view.DeletedAt.UTC().Format(time.RFC3339)
		deletedAtStr = &formatted
	}

	createdAtStr := view.CreatedAt.UTC().Format(time.RFC3339)
	updatedAtStr := view.UpdatedAt.UTC().Format(time.RFC3339)

	return publictrackapi.ModelsUserInvoice{
		BillingAddress:   lo.ToPtr(view.BillingAddress),
		CreatedAt:        &createdAtStr,
		Currency:         lo.ToPtr(view.Currency),
		Date:             &dateStr,
		DeletedAt:        deletedAtStr,
		DocumentId:       lo.ToPtr(view.DocumentID),
		DueDate:          dueDateStr,
		Items:            &items,
		Message:          lo.ToPtr(view.Message),
		PaymentTerms:     lo.ToPtr(view.PaymentTerms),
		PurchaseNumber:   lo.ToPtr(view.PurchaseNumber),
		Taxes:            &taxes,
		UpdatedAt:        &updatedAtStr,
		UserId:           lo.ToPtr(int(view.UserID)),
		UserInvoiceId:    lo.ToPtr(int(view.ID)),
		WorkspaceAddress: lo.ToPtr(view.WorkspaceAddress),
		WorkspaceId:      lo.ToPtr(int(view.WorkspaceID)),
	}
}

func writeInvoiceError(err error) error {
	switch {
	case errors.Is(err, billingapplication.ErrInvoiceNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	case errors.Is(err, billingapplication.ErrInvalidInvoice):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
}

func parseInvoiceDate(value *string) (time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return time.Now().UTC(), nil
	}
	return time.Parse("2006-01-02", strings.TrimSpace(*value))
}

func parseOptionalInvoiceDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
