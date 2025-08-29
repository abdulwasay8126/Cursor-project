-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_feedback_id ON comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now)
CREATE POLICY "Allow all operations on comments" ON comments
  FOR ALL USING (true);