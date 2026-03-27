package postgres

import (
	"context"
	"fmt"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"

	"github.com/jackc/pgx/v5/pgxpool"
)

type InvoiceStore struct {
	pool *pgxpool.Pool
}

func NewInvoiceStore(pool *pgxpool.Pool) *InvoiceStore {
	return &InvoiceStore{pool: pool}
}

func (store *InvoiceStore) ListInvoices(
	ctx context.Context,
	workspaceID int64,
	filter billingapplication.ListInvoicesFilter,
) ([]billingapplication.InvoiceView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, workspace_id, user_id, document_id, billing_address, workspace_address,
			currency, date, due_date, message, payment_terms, purchase_number,
			deleted_at, created_at, updated_at
		from billing_invoices
		where workspace_id = $1 and deleted_at is null
		order by id desc`,
		workspaceID,
	)
	if err != nil {
		return nil, writeBillingStoreError("list billing invoices", err)
	}
	defer rows.Close()

	invoices := make([]billingapplication.InvoiceView, 0)
	for rows.Next() {
		invoice, err := scanInvoice(rows)
		if err != nil {
			return nil, err
		}
		invoices = append(invoices, invoice)
	}
	if err := rows.Err(); err != nil {
		return nil, writeBillingStoreError("iterate billing invoices", err)
	}

	// Load items and taxes for each invoice.
	for index := range invoices {
		items, err := store.listInvoiceItems(ctx, invoices[index].ID)
		if err != nil {
			return nil, err
		}
		invoices[index].Items = items

		taxes, err := store.listInvoiceTaxes(ctx, invoices[index].ID)
		if err != nil {
			return nil, err
		}
		invoices[index].Taxes = taxes
	}

	return invoices, nil
}

func (store *InvoiceStore) GetInvoice(
	ctx context.Context,
	workspaceID int64,
	invoiceID int64,
) (billingapplication.InvoiceView, bool, error) {
	row := store.pool.QueryRow(
		ctx,
		`select id, workspace_id, user_id, document_id, billing_address, workspace_address,
			currency, date, due_date, message, payment_terms, purchase_number,
			deleted_at, created_at, updated_at
		from billing_invoices
		where workspace_id = $1 and id = $2 and deleted_at is null`,
		workspaceID,
		invoiceID,
	)
	invoice, err := scanInvoice(row)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return billingapplication.InvoiceView{}, false, nil
		}
		return billingapplication.InvoiceView{}, false, err
	}

	items, err := store.listInvoiceItems(ctx, invoice.ID)
	if err != nil {
		return billingapplication.InvoiceView{}, false, err
	}
	invoice.Items = items

	taxes, err := store.listInvoiceTaxes(ctx, invoice.ID)
	if err != nil {
		return billingapplication.InvoiceView{}, false, err
	}
	invoice.Taxes = taxes

	return invoice, true, nil
}

func (store *InvoiceStore) CreateInvoice(
	ctx context.Context,
	command billingapplication.CreateInvoiceCommand,
) (billingapplication.InvoiceView, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return billingapplication.InvoiceView{}, writeBillingStoreError("begin create invoice tx", err)
	}
	defer tx.Rollback(ctx)

	row := tx.QueryRow(
		ctx,
		`insert into billing_invoices (
			workspace_id, user_id, document_id, billing_address, workspace_address,
			currency, date, due_date, message, payment_terms, purchase_number
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		returning id, workspace_id, user_id, document_id, billing_address, workspace_address,
			currency, date, due_date, message, payment_terms, purchase_number,
			deleted_at, created_at, updated_at`,
		command.WorkspaceID,
		command.UserID,
		command.DocumentID,
		command.BillingAddress,
		command.WorkspaceAddress,
		command.Currency,
		command.Date,
		command.DueDate,
		command.Message,
		command.PaymentTerms,
		command.PurchaseNumber,
	)
	invoice, err := scanInvoice(row)
	if err != nil {
		return billingapplication.InvoiceView{}, err
	}

	items := make([]billingapplication.InvoiceItemView, 0, len(command.Items))
	for _, item := range command.Items {
		itemRow := tx.QueryRow(
			ctx,
			`insert into billing_invoice_items (invoice_id, description, quantity, amount)
			values ($1, $2, $3, $4)
			returning id, invoice_id, description, quantity, amount`,
			invoice.ID,
			item.Description,
			item.Quantity,
			item.Amount,
		)
		scanned, err := scanInvoiceItem(itemRow)
		if err != nil {
			return billingapplication.InvoiceView{}, err
		}
		items = append(items, scanned)
	}
	invoice.Items = items

	taxes := make([]billingapplication.InvoiceTaxView, 0, len(command.Taxes))
	for _, tax := range command.Taxes {
		taxRow := tx.QueryRow(
			ctx,
			`insert into billing_invoice_taxes (invoice_id, name, amount)
			values ($1, $2, $3)
			returning id, invoice_id, name, amount`,
			invoice.ID,
			tax.Name,
			tax.Amount,
		)
		scanned, err := scanInvoiceTax(taxRow)
		if err != nil {
			return billingapplication.InvoiceView{}, err
		}
		taxes = append(taxes, scanned)
	}
	invoice.Taxes = taxes

	if err := tx.Commit(ctx); err != nil {
		return billingapplication.InvoiceView{}, writeBillingStoreError("commit create invoice tx", err)
	}
	return invoice, nil
}

func (store *InvoiceStore) DeleteInvoice(
	ctx context.Context,
	workspaceID int64,
	invoiceID int64,
) error {
	_, err := store.pool.Exec(
		ctx,
		`update billing_invoices
		set deleted_at = now(), updated_at = now()
		where workspace_id = $1 and id = $2`,
		workspaceID,
		invoiceID,
	)
	if err != nil {
		return writeBillingStoreError("delete billing invoice", err)
	}
	return nil
}

func (store *InvoiceStore) listInvoiceItems(
	ctx context.Context,
	invoiceID int64,
) ([]billingapplication.InvoiceItemView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, invoice_id, description, quantity, amount
		from billing_invoice_items
		where invoice_id = $1
		order by id`,
		invoiceID,
	)
	if err != nil {
		return nil, writeBillingStoreError("list billing invoice items", err)
	}
	defer rows.Close()

	items := make([]billingapplication.InvoiceItemView, 0)
	for rows.Next() {
		item, err := scanInvoiceItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (store *InvoiceStore) listInvoiceTaxes(
	ctx context.Context,
	invoiceID int64,
) ([]billingapplication.InvoiceTaxView, error) {
	rows, err := store.pool.Query(
		ctx,
		`select id, invoice_id, name, amount
		from billing_invoice_taxes
		where invoice_id = $1
		order by id`,
		invoiceID,
	)
	if err != nil {
		return nil, writeBillingStoreError("list billing invoice taxes", err)
	}
	defer rows.Close()

	taxes := make([]billingapplication.InvoiceTaxView, 0)
	for rows.Next() {
		tax, err := scanInvoiceTax(rows)
		if err != nil {
			return nil, err
		}
		taxes = append(taxes, tax)
	}
	return taxes, rows.Err()
}

func scanInvoice(scanner interface {
	Scan(dest ...any) error
}) (billingapplication.InvoiceView, error) {
	var invoice billingapplication.InvoiceView
	if err := scanner.Scan(
		&invoice.ID,
		&invoice.WorkspaceID,
		&invoice.UserID,
		&invoice.DocumentID,
		&invoice.BillingAddress,
		&invoice.WorkspaceAddress,
		&invoice.Currency,
		&invoice.Date,
		&invoice.DueDate,
		&invoice.Message,
		&invoice.PaymentTerms,
		&invoice.PurchaseNumber,
		&invoice.DeletedAt,
		&invoice.CreatedAt,
		&invoice.UpdatedAt,
	); err != nil {
		return billingapplication.InvoiceView{}, writeBillingStoreError("scan billing invoice", err)
	}
	invoice.Date = invoice.Date.UTC()
	if invoice.DueDate != nil {
		utc := invoice.DueDate.UTC()
		invoice.DueDate = &utc
	}
	return invoice, nil
}

func scanInvoiceItem(scanner interface {
	Scan(dest ...any) error
}) (billingapplication.InvoiceItemView, error) {
	var item billingapplication.InvoiceItemView
	if err := scanner.Scan(
		&item.ID,
		&item.InvoiceID,
		&item.Description,
		&item.Quantity,
		&item.Amount,
	); err != nil {
		return billingapplication.InvoiceItemView{}, writeBillingStoreError("scan billing invoice item", err)
	}
	return item, nil
}

func scanInvoiceTax(scanner interface {
	Scan(dest ...any) error
}) (billingapplication.InvoiceTaxView, error) {
	var tax billingapplication.InvoiceTaxView
	if err := scanner.Scan(
		&tax.ID,
		&tax.InvoiceID,
		&tax.Name,
		&tax.Amount,
	); err != nil {
		return billingapplication.InvoiceTaxView{}, writeBillingStoreError("scan billing invoice tax", err)
	}
	return tax, nil
}

func writeBillingStoreError(operation string, err error) error {
	return fmt.Errorf("%s: %w", operation, err)
}

// Ensure InvoiceStore implements the interface at compile time.
var _ billingapplication.InvoiceStore = (*InvoiceStore)(nil)
