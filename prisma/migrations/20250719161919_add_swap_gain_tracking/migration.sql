-- Aggiungi campi opzionali per tracciare guadagni/perdite negli swap
-- Questi campi sono nullable per non rompere i dati esistenti

ALTER TABLE "CryptoPortfolioTransaction" 
ADD COLUMN "costBasis" DOUBLE PRECISION,
ADD COLUMN "realizedGainLoss" DOUBLE PRECISION;