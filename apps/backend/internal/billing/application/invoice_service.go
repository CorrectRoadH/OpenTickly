package application

import (
	"context"
	"fmt"
	"strings"

	"opentoggl/backend/apps/backend/internal/log"
)

type InvoiceService struct {
	store  InvoiceStore
	logger log.Logger
}

func NewInvoiceService(store InvoiceStore, logger log.Logger) (*InvoiceService, error) {
	if store == nil {
		return nil, ErrInvoiceStoreRequired
	}
	if logger == nil {
		return nil, fmt.Errorf("invoice service logger is required")
	}
	return &InvoiceService{store: store, logger: logger}, nil
}

func (service *InvoiceService) ListInvoices(ctx context.Context, workspaceID int64, filter ListInvoicesFilter) ([]InvoiceView, error) {
	if err := requireInvoiceWorkspaceID(workspaceID); err != nil {
		return nil, err
	}
	invoices, err := service.store.ListInvoices(ctx, workspaceID, filter)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list invoices",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	return invoices, nil
}

func (service *InvoiceService) GetInvoice(ctx context.Context, workspaceID int64, invoiceID int64) (InvoiceView, error) {
	if err := requireInvoiceWorkspaceID(workspaceID); err != nil {
		return InvoiceView{}, err
	}
	invoice, ok, err := service.store.GetInvoice(ctx, workspaceID, invoiceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get invoice",
			"workspace_id", workspaceID,
			"invoice_id", invoiceID,
			"error", err.Error(),
		)
		return InvoiceView{}, err
	}
	if !ok {
		return InvoiceView{}, ErrInvoiceNotFound
	}
	return invoice, nil
}

func (service *InvoiceService) CreateInvoice(ctx context.Context, command CreateInvoiceCommand) (InvoiceView, error) {
	if err := requireInvoiceWorkspaceID(command.WorkspaceID); err != nil {
		return InvoiceView{}, err
	}
	service.logger.InfoContext(ctx, "creating invoice",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
	)

	command.DocumentID = strings.TrimSpace(command.DocumentID)
	command.BillingAddress = strings.TrimSpace(command.BillingAddress)
	command.WorkspaceAddress = strings.TrimSpace(command.WorkspaceAddress)
	command.Currency = strings.TrimSpace(command.Currency)
	command.Message = strings.TrimSpace(command.Message)
	command.PaymentTerms = strings.TrimSpace(command.PaymentTerms)
	command.PurchaseNumber = strings.TrimSpace(command.PurchaseNumber)

	if command.Currency == "" {
		command.Currency = "USD"
	}

	invoice, err := service.store.CreateInvoice(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create invoice",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return InvoiceView{}, err
	}
	service.logger.InfoContext(ctx, "invoice created",
		"invoice_id", invoice.ID,
		"workspace_id", command.WorkspaceID,
	)
	return invoice, nil
}

func (service *InvoiceService) DeleteInvoice(ctx context.Context, workspaceID int64, invoiceID int64) error {
	if err := requireInvoiceWorkspaceID(workspaceID); err != nil {
		return err
	}
	service.logger.InfoContext(ctx, "deleting invoice",
		"workspace_id", workspaceID,
		"invoice_id", invoiceID,
	)

	// Verify invoice exists before soft-deleting.
	_, ok, err := service.store.GetInvoice(ctx, workspaceID, invoiceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get invoice for deletion",
			"workspace_id", workspaceID,
			"invoice_id", invoiceID,
			"error", err.Error(),
		)
		return err
	}
	if !ok {
		return ErrInvoiceNotFound
	}

	if err := service.store.DeleteInvoice(ctx, workspaceID, invoiceID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete invoice",
			"workspace_id", workspaceID,
			"invoice_id", invoiceID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "invoice deleted",
		"workspace_id", workspaceID,
		"invoice_id", invoiceID,
	)
	return nil
}

func requireInvoiceWorkspaceID(workspaceID int64) error {
	if workspaceID <= 0 {
		return ErrInvalidInvoice
	}
	return nil
}
