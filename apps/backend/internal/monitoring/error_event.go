package monitoring

import (
	"bytes"
	"encoding/json"
	"fmt"
	"maps"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"github.com/getsentry/sentry-go"
)

const filtered = "[Filtered]"

var (
	credentialHeader = regexp.MustCompile(`(?i)authorization|cookie|token|secret|key|password|passwd`)
	credentialKey    = regexp.MustCompile(`(?i)(^|[_.\[\]-])(token|secret|password|passwd|api[_-]?key|signature|sig|session|(auth|oauth|authorization|verification)[_.-]?code)($|[_.\[\]-])`)
	camelCase        = regexp.MustCompile(`([a-z0-9])([A-Z])`)
	queryPair        = regexp.MustCompile(`(^|[?&#])([^=?&#\s"'<>]+)=([^&#\s"'<>]*)`)
	urlUserInfo      = regexp.MustCompile(`(?i)([a-z][a-z0-9+.-]*://)[^/?#@\s"'<>]+@`)
	bearer           = regexp.MustCompile(`(?i)\b(Bearer(\s|%20|%09)+)[a-z0-9._~+/=-]+`)
	apiKey           = regexp.MustCompile(`(?i)\b(sk|pk)-[a-z0-9_-]+\b`)
	jwt              = regexp.MustCompile(`\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+`)
)

type credentialFilter struct {
	publicKey *regexp.Regexp
}

func newCredentialFilter(dsn string) credentialFilter {
	u, err := url.Parse(dsn)
	if err != nil || u.User == nil || u.User.Username() == "" {
		return credentialFilter{}
	}
	return credentialFilter{publicKey: regexp.MustCompile(`\b` + regexp.QuoteMeta(u.User.Username()) + `\b`)}
}

func sensitiveKey(key string) bool {
	return strings.EqualFold(key, "code") ||
		credentialKey.MatchString(camelCase.ReplaceAllString(key, "${1}_${2}"))
}

func (f credentialFilter) text(value string) string {
	value = queryPair.ReplaceAllStringFunc(value, func(pair string) string {
		prefix, _, _ := strings.Cut(pair, "=")
		key := strings.TrimLeft(prefix, "?&#")
		if decoded, err := url.QueryUnescape(key); err == nil {
			key = decoded
		}
		if sensitiveKey(key) {
			return prefix + "=" + filtered
		}
		return pair
	})
	value = urlUserInfo.ReplaceAllString(value, "${1}"+filtered+"@")
	value = bearer.ReplaceAllString(value, "${1}"+filtered)
	value = apiKey.ReplaceAllString(value, filtered)
	value = jwt.ReplaceAllString(value, filtered)
	if f.publicKey != nil {
		value = f.publicKey.ReplaceAllString(value, filtered)
	}
	return value
}

func (f credentialFilter) fields(fields sentry.Context) (clean sentry.Context) {
	if len(fields) == 0 {
		return fields
	}
	// SDK contexts can hold arbitrary user-defined values. Apply the filter to
	// their JSON representation so custom structs and typed slices are covered.
	// A panicking custom marshaler must not interrupt the original capture.
	defer func() {
		if recover() != nil {
			clean = nil
		}
	}()
	wire, err := json.Marshal(fields)
	if err != nil {
		return nil
	}
	decoder := json.NewDecoder(bytes.NewReader(wire))
	decoder.UseNumber()
	var decoded sentry.Context
	if err := decoder.Decode(&decoded); err != nil {
		return nil
	}
	f.filterFields(decoded, false)
	return decoded
}

func (f credentialFilter) filterFields(fields sentry.Context, headers bool) {
	for key, value := range fields {
		sensitive := sensitiveKey(key)
		if headers {
			sensitive = credentialHeader.MatchString(key)
		}
		if sensitive {
			fields[key] = filtered
		} else {
			fields[key] = f.fieldValue(value, strings.EqualFold(key, "headers"))
		}
	}
}

func (f credentialFilter) fieldValue(value any, headers bool) any {
	switch value := value.(type) {
	case string:
		return f.text(value)
	case sentry.Context:
		f.filterFields(value, headers)
	case []any:
		for i := range value {
			value[i] = f.fieldValue(value[i], headers)
		}
	}
	return value
}

func (f credentialFilter) stringFields(fields map[string]string, sensitive func(string) bool) map[string]string {
	clean := maps.Clone(fields)
	for key, value := range clean {
		if sensitive(key) {
			clean[key] = filtered
		} else {
			clean[key] = f.text(value)
		}
	}
	return clean
}

func (f credentialFilter) stacktrace(stack *sentry.Stacktrace) *sentry.Stacktrace {
	if stack == nil {
		return nil
	}
	clean := *stack
	clean.Frames = slices.Clone(stack.Frames)
	for i := range clean.Frames {
		frame := &clean.Frames[i]
		frame.Filename = f.text(frame.Filename)
		frame.AbsPath = f.text(frame.AbsPath)
		frame.Function = f.text(frame.Function)
		frame.Symbol = f.text(frame.Symbol)
		frame.Module = f.text(frame.Module)
		frame.Package = f.text(frame.Package)
		frame.ContextLine = f.text(frame.ContextLine)
		frame.PreContext = f.lines(frame.PreContext)
		frame.PostContext = f.lines(frame.PostContext)
		frame.Vars = f.fields(frame.Vars)
	}
	return &clean
}

func (f credentialFilter) lines(lines []string) []string {
	clean := slices.Clone(lines)
	for i, line := range clean {
		clean[i] = f.text(line)
	}
	return clean
}

func (f credentialFilter) errorEvent(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
	clean := *event
	clean.Logger = f.text(event.Logger)
	clean.Transaction = f.text(event.Transaction)
	clean.Fingerprint = f.lines(event.Fingerprint)
	clean.User = sentry.User{}
	clean.ServerName = ""
	clean.Attachments = nil
	clean.Tags = f.stringFields(event.Tags, sensitiveKey)
	if clean.Tags == nil {
		clean.Tags = make(map[string]string)
	}
	clean.Tags["component"] = "api"
	clean.Contexts = maps.Clone(event.Contexts)
	for name, context := range clean.Contexts {
		clean.Contexts[name] = f.fields(context)
	}
	clean.Exception = slices.Clone(event.Exception)
	if hint != nil && hint.RecoveredException != nil {
		recordPanic(&clean, hint.RecoveredException)
	}
	clean.Message = f.text(event.Message)
	for i := range clean.Exception {
		exception := &clean.Exception[i]
		exception.Type = f.text(exception.Type)
		exception.Value = f.text(exception.Value)
		exception.Module = f.text(exception.Module)
		exception.Stacktrace = f.stacktrace(exception.Stacktrace)
		if exception.Mechanism != nil {
			mechanism := *exception.Mechanism
			mechanism.Type = f.text(mechanism.Type)
			mechanism.Description = f.text(mechanism.Description)
			mechanism.HelpLink = f.text(mechanism.HelpLink)
			mechanism.Source = f.text(mechanism.Source)
			mechanism.Data = f.fields(mechanism.Data)
			exception.Mechanism = &mechanism
		}
	}
	clean.Threads = slices.Clone(event.Threads)
	for i := range clean.Threads {
		clean.Threads[i].Name = f.text(clean.Threads[i].Name)
		clean.Threads[i].Stacktrace = f.stacktrace(clean.Threads[i].Stacktrace)
	}
	clean.Breadcrumbs = slices.Clone(event.Breadcrumbs)
	for i, breadcrumb := range clean.Breadcrumbs {
		if breadcrumb != nil {
			entry := *breadcrumb
			entry.Type = f.text(entry.Type)
			entry.Category = f.text(entry.Category)
			entry.Message = f.text(entry.Message)
			entry.Data = f.fields(entry.Data)
			clean.Breadcrumbs[i] = &entry
		}
	}
	if event.Request != nil {
		request := *event.Request
		request.URL = f.text(request.URL)
		request.Method = f.text(request.Method)
		request.QueryString = f.text(request.QueryString)
		request.Headers = f.stringFields(request.Headers, credentialHeader.MatchString)
		request.Data = ""
		request.Cookies = ""
		request.Env = nil
		clean.Request = &request
	}
	return &clean
}

func recordPanic(event *sentry.Event, value any) {
	if len(event.Exception) == 0 {
		// The SDK captures non-error panic values as bare messages.
		event.Exception = []sentry.Exception{{
			Type: fmt.Sprintf("%T", value), Value: event.Message, Stacktrace: sentry.NewStacktrace(),
		}}
	}
	primary := &event.Exception[len(event.Exception)-1]
	var mechanism sentry.Mechanism
	if primary.Mechanism != nil {
		mechanism = *primary.Mechanism
	}
	mechanism.Type = "panic"
	mechanism.SetUnhandled()
	primary.Mechanism = &mechanism
}
