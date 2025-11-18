-- Codex Conversations Table
CREATE TABLE IF NOT EXISTS codex_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id TEXT NOT NULL,
    task TEXT, -- 'generate', 'explain', 'refactor', 'debug', 'translate', 'document', 'chat'
    language TEXT, -- Programming language
    user_input TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_codex_conversations_user ON codex_conversations(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_codex_conversations_created ON codex_conversations(created_at DESC);

-- Codex Code Snippets Table (for saving favorite snippets)
CREATE TABLE IF NOT EXISTS codex_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    language TEXT,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_codex_snippets_user ON codex_snippets(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_codex_snippets_tags ON codex_snippets USING GIN(tags);

