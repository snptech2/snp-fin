-- Core Transaction indexes (most critical)
CREATE INDEX IF NOT EXISTS "idx_transaction_user_type_date" ON "Transaction"("userId", "type", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_transaction_user_account_date" ON "Transaction"("userId", "accountId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_transaction_user_category_date" ON "Transaction"("userId", "categoryId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_transaction_user_date" ON "Transaction"("userId", "date" DESC);

-- Account indexes
CREATE INDEX IF NOT EXISTS "idx_account_user_type_default" ON "Account"("userId", "type", "isDefault");
CREATE INDEX IF NOT EXISTS "idx_account_user_type" ON "Account"("userId", "type");

-- Category indexes
CREATE INDEX IF NOT EXISTS "idx_category_user_type" ON "Category"("userId", "type");

-- Crypto Portfolio indexes
CREATE INDEX IF NOT EXISTS "idx_crypto_transaction_portfolio_asset_date" ON "CryptoPortfolioTransaction"("portfolioId", "assetId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_crypto_holding_portfolio_asset" ON "CryptoPortfolioHolding"("portfolioId", "assetId");
CREATE INDEX IF NOT EXISTS "idx_crypto_portfolio_user_active" ON "CryptoPortfolio"("userId", "isActive");

-- DCA Portfolio indexes
CREATE INDEX IF NOT EXISTS "idx_dca_transaction_portfolio_date" ON "DCATransaction"("portfolioId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_dca_portfolio_user_active" ON "DCAPortfolio"("userId", "isActive");

-- Transfer and Budget indexes
CREATE INDEX IF NOT EXISTS "idx_transfer_user_date" ON "Transfer"("userId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_budget_user_order" ON "Budget"("userId", "order");