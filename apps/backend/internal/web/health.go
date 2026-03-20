package web

type HealthSnapshot struct {
	Service string   `json:"service"`
	Status  string   `json:"status"`
	Modules []string `json:"modules"`
}

func NewHealthSnapshot(service string, modules []string) HealthSnapshot {
	return HealthSnapshot{
		Service: service,
		Status:  "ok",
		Modules: modules,
	}
}
