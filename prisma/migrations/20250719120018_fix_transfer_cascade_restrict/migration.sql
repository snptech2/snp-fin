-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_gainTransactionId_fkey";

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_gainTransactionId_fkey" FOREIGN KEY ("gainTransactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
