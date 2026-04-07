package application

import (
	"context"
	"strings"
)

func (service *Service) ListExpenses(ctx context.Context, workspaceID int64, userID int64) ([]ExpenseView, error) {
	expenses, err := service.store.ListExpenses(ctx, workspaceID, userID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list expenses",
			"workspace_id", workspaceID,
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}
	return expenses, nil
}

func (service *Service) CreateExpense(ctx context.Context, command CreateExpenseCommand) (ExpenseView, error) {
	service.logger.InfoContext(ctx, "creating expense",
		"workspace_id", command.WorkspaceID,
		"user_id", command.UserID,
		"description", command.Description,
	)
	expense, err := service.store.CreateExpense(ctx, CreateExpenseRecord{
		WorkspaceID:   command.WorkspaceID,
		UserID:        command.UserID,
		TimeEntryID:   command.TimeEntryID,
		Description:   strings.TrimSpace(command.Description),
		Category:      strings.TrimSpace(command.Category),
		State:         strings.TrimSpace(command.State),
		Currency:      strings.TrimSpace(command.Currency),
		TotalAmount:   command.TotalAmount,
		DateOfExpense: command.DateOfExpense,
	})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to create expense",
			"workspace_id", command.WorkspaceID,
			"user_id", command.UserID,
			"error", err.Error(),
		)
		return ExpenseView{}, err
	}
	service.logger.InfoContext(ctx, "expense created",
		"expense_id", expense.ID,
	)
	return expense, nil
}
