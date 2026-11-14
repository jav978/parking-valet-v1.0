-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "exit_cash_register_id" UUID;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_exit_cash_register_id_fkey" FOREIGN KEY ("exit_cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
