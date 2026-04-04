-- Initial database setup
-- Migrations are handled by golang-migrate, this file runs on first container start

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify connection
SELECT 'Pixelly DB initialized' AS status;
