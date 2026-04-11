package filestore

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("filestore: blob not found")

// Store provides access to binary file storage backed by PostgreSQL.
type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Put(ctx context.Context, key string, contentType string, content []byte) error {
	_, err := s.pool.Exec(ctx, `
		insert into file_blobs (storage_key, content_type, content)
		values ($1, $2, $3)
		on conflict (storage_key) do update
		set content_type = excluded.content_type,
		    content = excluded.content,
		    created_at = now()
	`, key, contentType, content)
	if err != nil {
		return fmt.Errorf("filestore put %q: %w", key, err)
	}
	return nil
}

func (s *Store) Get(ctx context.Context, key string) (contentType string, content []byte, err error) {
	err = s.pool.QueryRow(ctx, `
		select content_type, content from file_blobs where storage_key = $1
	`, key).Scan(&contentType, &content)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, ErrNotFound
	}
	if err != nil {
		return "", nil, fmt.Errorf("filestore get %q: %w", key, err)
	}
	return contentType, content, nil
}

func (s *Store) Delete(ctx context.Context, key string) error {
	_, err := s.pool.Exec(ctx, `delete from file_blobs where storage_key = $1`, key)
	if err != nil {
		return fmt.Errorf("filestore delete %q: %w", key, err)
	}
	return nil
}
