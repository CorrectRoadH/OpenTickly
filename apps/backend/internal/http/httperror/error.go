package httperror

import "fmt"

type Error struct {
	Code    int
	Message any
	Cause   error
}

func New(code int, message any) *Error {
	return &Error{Code: code, Message: message}
}

func (err *Error) WithCause(cause error) *Error {
	return &Error{Code: err.Code, Message: err.Message, Cause: cause}
}

func (err *Error) Error() string {
	if err.Cause != nil {
		return fmt.Sprintf("code=%d, message=%v, internal=%v", err.Code, err.Message, err.Cause)
	}
	return fmt.Sprintf("code=%d, message=%v", err.Code, err.Message)
}

func (err *Error) StatusCode() int { return err.Code }
func (err *Error) Unwrap() error   { return err.Cause }
