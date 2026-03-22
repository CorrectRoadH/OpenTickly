package web

import (
	"embed"
	"io/fs"
	"strings"
)

//go:embed dist dist/*
var embeddedStaticFiles embed.FS

const missingWebsiteAssetsMarker = "OpenToggl Source Build Without Website Assets"

func StaticFiles() (fs.FS, bool) {
	dist, err := fs.Sub(embeddedStaticFiles, "dist")
	if err != nil {
		panic(err)
	}

	indexHTML, err := fs.ReadFile(dist, "index.html")
	if err != nil {
		panic(err)
	}

	if strings.Contains(string(indexHTML), missingWebsiteAssetsMarker) {
		return nil, false
	}

	return dist, true
}
