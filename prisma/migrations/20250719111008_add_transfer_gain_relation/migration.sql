/*
  Warnings:

  - A unique constraint covering the columns `[gainTransactionId]` on the table `Transfer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "gainTransactionId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_gainTransactionId_key" ON "Transfer"("gainTransactionId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_gainTransactionId_fkey" FOREIGN KEY ("gainTransactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
