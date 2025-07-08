/*
  Warnings:

  - You are about to drop the `changelog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "changelog" DROP CONSTRAINT "changelog_updatedBy_fkey";

-- DropIndex
DROP INDEX "idx_account_user_type";

-- DropIndex
DROP INDEX "idx_account_user_type_default";

-- DropIndex
DROP INDEX "idx_budget_user_order";

-- DropIndex
DROP INDEX "idx_category_user_type";

-- DropIndex
DROP INDEX "idx_crypto_portfolio_user_active";

-- DropIndex
DROP INDEX "idx_crypto_holding_portfolio_asset";

-- DropIndex
DROP INDEX "idx_crypto_transaction_portfolio_asset_date";

-- DropIndex
DROP INDEX "idx_dca_portfolio_user_active";

-- DropIndex
DROP INDEX "idx_dca_transaction_portfolio_date";

-- DropIndex
DROP INDEX "idx_transaction_user_account_date";

-- DropIndex
DROP INDEX "idx_transaction_user_category_date";

-- DropIndex
DROP INDEX "idx_transaction_user_date";

-- DropIndex
DROP INDEX "idx_transaction_user_type_date";

-- DropIndex
DROP INDEX "idx_transfer_user_date";

-- AlterTable
ALTER TABLE "NetworkFee" ADD COLUMN     "assetId" INTEGER,
ADD COLUMN     "cryptoPortfolioId" INTEGER,
ADD COLUMN     "eurValue" DOUBLE PRECISION,
ADD COLUMN     "quantity" DOUBLE PRECISION,
ALTER COLUMN "sats" DROP NOT NULL,
ALTER COLUMN "portfolioId" DROP NOT NULL;

-- DropTable
DROP TABLE "changelog";

-- CreateTable
CREATE TABLE "partita_iva_configs" (
    "id" SERIAL NOT NULL,
    "anno" INTEGER NOT NULL,
    "percentualeImponibile" DOUBLE PRECISION NOT NULL DEFAULT 78,
    "percentualeImposta" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "percentualeContributi" DOUBLE PRECISION NOT NULL DEFAULT 26.23,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "partita_iva_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partita_iva_incomes" (
    "id" SERIAL NOT NULL,
    "dataIncasso" TIMESTAMP(3) NOT NULL,
    "dataEmissione" TIMESTAMP(3) NOT NULL,
    "riferimento" TEXT NOT NULL,
    "entrata" DOUBLE PRECISION NOT NULL,
    "imponibile" DOUBLE PRECISION NOT NULL,
    "imposta" DOUBLE PRECISION NOT NULL,
    "contributi" DOUBLE PRECISION NOT NULL,
    "totaleTasse" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "accountId" INTEGER,

    CONSTRAINT "partita_iva_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partita_iva_tax_payments" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'generico',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER,

    CONSTRAINT "partita_iva_tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_current_assets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "non_current_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partita_iva_configs_anno_userId_key" ON "partita_iva_configs"("anno", "userId");

-- AddForeignKey
ALTER TABLE "NetworkFee" ADD CONSTRAINT "NetworkFee_cryptoPortfolioId_fkey" FOREIGN KEY ("cryptoPortfolioId") REFERENCES "CryptoPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkFee" ADD CONSTRAINT "NetworkFee_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CryptoPortfolioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_configs" ADD CONSTRAINT "partita_iva_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_incomes" ADD CONSTRAINT "partita_iva_incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_incomes" ADD CONSTRAINT "partita_iva_incomes_configId_fkey" FOREIGN KEY ("configId") REFERENCES "partita_iva_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_incomes" ADD CONSTRAINT "partita_iva_incomes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_tax_payments" ADD CONSTRAINT "partita_iva_tax_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partita_iva_tax_payments" ADD CONSTRAINT "partita_iva_tax_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_current_assets" ADD CONSTRAINT "non_current_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
