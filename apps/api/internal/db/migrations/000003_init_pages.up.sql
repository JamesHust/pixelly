CREATE TABLE IF NOT EXISTS pages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL DEFAULT 'Page 1',
    "order"    INTEGER NOT NULL DEFAULT 0,
    yjs_state  BYTEA, -- Y.js document binary snapshot
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    canvas_x   FLOAT,
    canvas_y   FLOAT,
    resolved   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pages_project_id ON pages(project_id);
CREATE INDEX idx_comments_page_id ON comments(page_id);
