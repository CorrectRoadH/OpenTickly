package web

import (
	"embed"
	"io/fs"
)

//go:embed dist dist/*
var embeddedStaticFiles embed.FS

func StaticFiles() fs.FS {
	dist, err := fs.Sub(embeddedStaticFiles, "dist")
	if err != nil {
		panic(err)
	}
	return dist
}
