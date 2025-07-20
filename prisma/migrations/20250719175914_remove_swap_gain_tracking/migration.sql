ALTER TABLE "CryptoPortfolioTransaction"
  DROP COLUMN IF EXISTS "costBasis",
  DROP COLUMN IF EXISTS "realizedGainLoss";