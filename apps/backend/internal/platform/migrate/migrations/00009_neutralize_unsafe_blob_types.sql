-- +goose Up

-- Historical uploads trusted the client-supplied Content-Type header, so the
-- filestore may hold avatar/logo blobs stored as image/svg+xml, text/html, or
-- application/xhtml+xml. Serving those from the same origin as the SPA turned
-- them into a stored-XSS vector. Upload handlers now sniff and pin the type,
-- but pre-existing rows must be neutralised too.
--
-- Rewriting the content_type to application/octet-stream makes the browser
-- download these historical blobs instead of rendering them. Users whose
-- avatar or workspace logo happens to match will see a broken image and need
-- to re-upload; that is the correct outcome here.
update file_blobs
set content_type = 'application/octet-stream'
where content_type ilike '%svg%'
   or content_type ilike '%html%'
   or content_type ilike '%javascript%'
   or content_type ilike '%xml%';

-- +goose Down

-- No-op: reversing the rewrite would re-introduce the XSS surface. Down is
-- intentionally empty so a `goose down` does not resurrect unsafe types.
