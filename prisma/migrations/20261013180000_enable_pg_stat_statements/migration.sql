-- RDS preloads pg_stat_statements (default.postgres17 shared_preload_libraries); this only creates the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
