package bootstrap

import "github.com/labstack/echo/v4"

func (server *publicTrackOpenAPIServer) GetWorkspaceInvoices(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.billing.GetWorkspaceInvoices(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceUserInvoice(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.billing.PostWorkspaceUserInvoice(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceInvoice(ctx echo.Context, workspaceId int, invoiceId int) error {
	_ = workspaceId
	_ = invoiceId
	return server.billing.GetWorkspaceInvoice(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceInvoice(ctx echo.Context, workspaceId int, userInvoiceId int) error {
	_ = workspaceId
	_ = userInvoiceId
	return server.billing.DeleteWorkspaceInvoice(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacePurchaseOrderPdf(ctx echo.Context, workspaceId int, purchaseOrderId int) error {
	_ = workspaceId
	_ = purchaseOrderId
	return server.billing.GetWorkspacePurchaseOrderPdf(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacePaymentReceipts(ctx echo.Context, workspaceId int, paymentId int) error {
	_ = workspaceId
	_ = paymentId
	return server.billing.GetWorkspacePaymentReceipts(ctx)
}
