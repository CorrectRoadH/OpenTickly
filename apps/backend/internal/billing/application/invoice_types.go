package application

import (
	"context"
	"errors"
	"time"
)

var (
	ErrInvoiceStoreRequired = errors.New("billing invoice store is required")
	ErrInvoiceNotFound      = errors.New("billing invoice not found")
	ErrInvalidInvoice       = errors.New("billing invoice workspace id must be positive")
)

type InvoiceView struct {
	ID               int64
	WorkspaceID      int64
	UserID           int64
	DocumentID       string
	BillingAddress   string
	WorkspaceAddress string
	Currency         string
	Date             time.Time
	DueDate          *time.Time
	Message          string
	PaymentTerms     string
	PurchaseNumber   string
	Items            []InvoiceItemView
	Taxes            []InvoiceTaxView
	DeletedAt        *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type InvoiceItemView struct {
	ID          int64
	InvoiceID   int64
	Description string
	Quantity    float64
	Amount      float64
}

type InvoiceTaxView struct {
	ID        int64
	InvoiceID int64
	Name      string
	Amount    float64
}

type CreateInvoiceCommand struct {
	WorkspaceID      int64
	UserID           int64
	DocumentID       string
	BillingAddress   string
	WorkspaceAddress string
	Currency         string
	Date             time.Time
	DueDate          *time.Time
	Message          string
	PaymentTerms     string
	PurchaseNumber   string
	Items            []CreateInvoiceItemInput
	Taxes            []CreateInvoiceTaxInput
}

type CreateInvoiceItemInput struct {
	Description string
	Quantity    float64
	Amount      float64
}

type CreateInvoiceTaxInput struct {
	Name   string
	Amount float64
}

type ListInvoicesFilter struct {
	// Reserved for future filtering (e.g. date range, status).
}

type InvoiceStore interface {
	ListInvoices(ctx context.Context, workspaceID int64, filter ListInvoicesFilter) ([]InvoiceView, error)
	GetInvoice(ctx context.Context, workspaceID int64, invoiceID int64) (InvoiceView, bool, error)
	CreateInvoice(ctx context.Context, command CreateInvoiceCommand) (InvoiceView, error)
	DeleteInvoice(ctx context.Context, workspaceID int64, invoiceID int64) error
}
