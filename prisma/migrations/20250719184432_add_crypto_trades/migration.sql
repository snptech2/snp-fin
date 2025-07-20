/*
  Warnings:

  - You are about to drop the column `costBasis` on the `CryptoPortfolioTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `realizedGainLoss` on the `CryptoPortfolioTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CryptoPortfolioTransaction" DROP COLUMN "costBasis",
DROP COLUMN "realizedGainLoss";

-- CreateTable
CREATE TABLE "crypto_trades" (
    "id" SERIAL NOT NULL,
    "portfolioId" INTEGER NOT NULL,
    "fromAssetId" INTEGER NOT NULL,
    "toAssetId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "openSwapId" INTEGER,
    "closeSwapId" INTEGER,
    "openDate" TIMESTAMP(3) NOT NULL,
    "closeDate" TIMESTAMP(3),
    "initialValue" DOUBLE PRECISION NOT NULL,
    "finalValue" DOUBLE PRECISION,
    "realizedPnL" DOUBLE PRECISION,
    "pnLPercentage" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_trades_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "crypto_trades" ADD CONSTRAINT "crypto_trades_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "CryptoPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_trades" ADD CONSTRAINT "crypto_trades_fromAssetId_fkey" FOREIGN KEY ("fromAssetId") REFERENCES "CryptoPortfolioAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_trades" ADD CONSTRAINT "crypto_trades_toAssetId_fkey" FOREIGN KEY ("toAssetId") REFERENCES "CryptoPortfolioAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_trades" ADD CONSTRAINT "crypto_trades_openSwapId_fkey" FOREIGN KEY ("openSwapId") REFERENCES "CryptoPortfolioTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_trades" ADD CONSTRAINT "crypto_trades_closeSwapId_fkey" FOREIGN KEY ("closeSwapId") REFERENCES "CryptoPortfolioTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
