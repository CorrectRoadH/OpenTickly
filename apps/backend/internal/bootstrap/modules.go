package bootstrap

// ModuleDescriptor is kept dumb on purpose: Wave 0 only needs a stable module
// inventory so later slices wire concrete use cases without reshaping the root.
type ModuleDescriptor struct {
	Name string
}

func defaultModules() []ModuleDescriptor {
	return []ModuleDescriptor{
		{Name: "identity"},
		{Name: "tenant"},
		{Name: "membership"},
		{Name: "catalog"},
		{Name: "tracking"},
		{Name: "governance"},
		{Name: "reports"},
		{Name: "webhooks"},
		{Name: "billing"},
		{Name: "importing"},
	}
}
