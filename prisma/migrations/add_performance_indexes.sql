-- Migration: Add Performance Indexes
-- Questo script aggiunge tutti gli indici critici per migliorare le performance

-- =============================================
-- INDICI CRITICI PER TRANSACTION (Più utilizzata)
-- =============================================

-- Indice composito per filtri dashboard (userId + type + date)
-- Utilizzato in: dashboard, expense/income pages
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_user_type_date" 
ON "Transaction" ("userId", "type", "date" DESC);

-- Indice composito per filtri per account (userId + accountId + date)  
-- Utilizzato in: filtri transazioni per account specifico
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_user_account_date"
ON "Transaction" ("userId", "accountId", "date" DESC);

-- Indice composito per filtri per categoria (userId + categoryId + date)
-- Utilizzato in: filtri transazioni per categoria specifica
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_user_category_date"
ON "Transaction" ("userId", "categoryId", "date" DESC);

-- Indice per query temporali generiche (userId + date)
-- Utilizzato in: statistiche mensili, range di date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_user_date"
ON "Transaction" ("userId", "date" DESC);

-- =============================================
-- INDICI PER ACCOUNT (Lookup frequenti)
-- =============================================

-- Indice composito per trovare account default per tipo
-- Utilizzato in: form transazioni, import CSV
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_user_type_default"
ON "Account" ("userId", "type", "isDefault");

-- Indice per lookup per tipo di account
-- Utilizzato in: filtri account bancari vs investimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_user_type"
ON "Account" ("userId", "type");

-- =============================================
-- INDICI PER CATEGORY (Filtri)
-- =============================================

-- Indice composito per trovare categorie per tipo
-- Utilizzato in: form transazioni (income vs expense)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_category_user_type"
ON "Category" ("userId", "type");

-- =============================================
-- INDICI PER PARTITA IVA (Statistiche)
-- =============================================

-- Indice composito per statistiche mensili P.IVA
-- Utilizzato in: calcoli fiscali, dashboard P.IVA
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_partita_iva_income_user_date"
ON "partita_iva_incomes" ("userId", "dataIncasso" DESC);

-- Indice per collegamento configurazione (query già veloce ma ottimizziamo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_partita_iva_income_config"
ON "partita_iva_incomes" ("configId", "dataIncasso" DESC);

-- Indice per pagamenti tasse
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_partita_iva_payments_user_date"
ON "partita_iva_tax_payments" ("userId", "data" DESC);

-- =============================================
-- INDICI PER CRYPTO PORTFOLIO (Performance critiche)
-- =============================================

-- Indice composito per transazioni crypto per portfolio e asset
-- Utilizzato in: calcolo holdings, statistiche portfolio
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_crypto_transaction_portfolio_asset_date"
ON "CryptoPortfolioTransaction" ("portfolioId", "assetId", "date" DESC);

-- Indice per lookup holdings (dovrebbe già esistere unique constraint)
-- Verifichiamo che sia ottimizzato per query
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_crypto_holding_portfolio_asset"
ON "CryptoPortfolioHolding" ("portfolioId", "assetId");

-- Indice per portfolio attivi dell'utente
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_crypto_portfolio_user_active"
ON "CryptoPortfolio" ("userId", "isActive");

-- =============================================
-- INDICI PER DCA PORTFOLIO (Bitcoin)
-- =============================================

-- Indice per transazioni DCA per portfolio
-- Utilizzato in: statistiche DCA, calcoli performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_dca_transaction_portfolio_date"
ON "DCATransaction" ("portfolioId", "date" DESC);

-- Indice per DCA portfolio attivi
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_dca_portfolio_user_active"
ON "DCAPortfolio" ("userId", "isActive");

-- =============================================
-- INDICI PER TRANSFER (Meno critici ma utili)
-- =============================================

-- Indice per transfer dell'utente per data
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transfer_user_date"
ON "Transfer" ("userId", "date" DESC);

-- =============================================
-- INDICI PER NETWORK FEES (Portfolio crypto)
-- =============================================

-- Indice per network fees per crypto portfolio
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_network_fee_crypto_portfolio_date"
ON "NetworkFee" ("cryptoPortfolioId", "date" DESC) 
WHERE "cryptoPortfolioId" IS NOT NULL;

-- Indice per network fees per DCA portfolio  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_network_fee_dca_portfolio_date"
ON "NetworkFee" ("portfolioId", "date" DESC)
WHERE "portfolioId" IS NOT NULL;

-- =============================================
-- INDICI PER BUDGET (Dashboard)
-- =============================================

-- Indice per budget dell'utente per ordine
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_budget_user_order"
ON "Budget" ("userId", "order");

-- =============================================
-- STATISTICHE E VERIFICA
-- =============================================

-- Comandi di verifica che eseguirai dopo la migrazione:
-- 
-- 1. Verifica indici creati:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
--
-- 2. Verifica dimensioni indici:
-- SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC;
--
-- 3. Test performance query più comune:
-- EXPLAIN ANALYZE SELECT * FROM "Transaction" WHERE "userId" = 1 AND "type" = 'expense' ORDER BY "date" DESC LIMIT 20;