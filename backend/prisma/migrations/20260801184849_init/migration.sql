-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'SUBSCRIPTION', 'APP', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'SUV', 'VAN', 'BUS', 'BICYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'HALF_HOURLY', 'FRACTIONAL', 'DAILY', 'NIGHTLY', 'MONTHLY', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SpotStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID', 'PASSPORT', 'DRIVERS_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('REGULAR', 'FREQUENT', 'VIP', 'CORPORATE');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PrinterInterface" AS ENUM ('USB', 'NETWORK');

-- CreateEnum
CREATE TYPE "PaperWidth" AS ENUM ('MM_58', 'MM_80');

-- CreateEnum
CREATE TYPE "AccessEventType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role_id" UUID NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "id" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "client_type" "ClientType" NOT NULL DEFAULT 'REGULAR',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "client_id" UUID,
    "plate_number" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_lots" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "total_spots" INTEGER NOT NULL DEFAULT 0,
    "available_spots" INTEGER NOT NULL DEFAULT 0,
    "opening_time" TEXT,
    "closing_time" TEXT,
    "is_24h" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_ev_charging" BOOLEAN NOT NULL DEFAULT false,
    "has_security" BOOLEAN NOT NULL DEFAULT false,
    "has_covered" BOOLEAN NOT NULL DEFAULT false,
    "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "logo_url" TEXT,
    "ticket_prefix" TEXT NOT NULL DEFAULT 'TKT',
    "ticket_next_num" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "parking_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spot_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_spots" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "spot_number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT,
    "spot_type_id" UUID NOT NULL,
    "status" "SpotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "parking_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rates" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "spot_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "fractional_minutes" INTEGER,
    "fractional_rate" DECIMAL(10,2),
    "daily_max" DECIMAL(10,2),
    "night_rate" DECIMAL(10,2),
    "monthly_rate" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "lot_id" UUID NOT NULL,
    "spot_id" UUID,
    "client_id" UUID,
    "vehicle_id" UUID,
    "plate_number" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL,
    "exit_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "rate_id" UUID,
    "base_amount" DECIMAL(10,2),
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "total_amount" DECIMAL(10,2),
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "entry_operator_id" UUID NOT NULL,
    "exit_operator_id" UUID,
    "entry_cash_register_id" UUID,
    "notes" TEXT,
    "entry_photo_url" TEXT,
    "plate_photo_url" TEXT,
    "qr_hash" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_number" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "opened_by" UUID NOT NULL,
    "closed_by" UUID,
    "opening_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(10,2),
    "expected_balance" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_movements" (
    "id" UUID NOT NULL,
    "cash_register_id" UUID NOT NULL,
    "type" "MovementType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_number" TEXT,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "spot_id" UUID,
    "subscription_type" "RateType" NOT NULL DEFAULT 'MONTHLY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "rate_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "spot_id" UUID,
    "ticket_id" UUID,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "event_type" "AccessEventType" NOT NULL,
    "access_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operator_id" UUID NOT NULL,
    "gate_number" TEXT,
    "plate_number" TEXT,
    "image_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_configs" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "interface_type" "PrinterInterface" NOT NULL,
    "device_path" TEXT,
    "ip_address" TEXT,
    "port" INTEGER,
    "paper_width" "PaperWidth" NOT NULL DEFAULT 'MM_80',
    "characters_per_line" INTEGER DEFAULT 42,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "filesize" BIGINT,
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "permissions_code_idx" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_token_jti_idx" ON "blacklisted_tokens"("token_jti");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_expires_at_idx" ON "blacklisted_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_is_active_idx" ON "clients"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_type_document_number_key" ON "clients"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_plate_number_idx" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_client_id_idx" ON "vehicles"("client_id");

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_idx" ON "vehicles"("vehicle_type");

-- CreateIndex
CREATE UNIQUE INDEX "parking_lots_code_key" ON "parking_lots"("code");

-- CreateIndex
CREATE INDEX "parking_lots_code_idx" ON "parking_lots"("code");

-- CreateIndex
CREATE INDEX "parking_lots_is_active_idx" ON "parking_lots"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "spot_types_code_key" ON "spot_types"("code");

-- CreateIndex
CREATE INDEX "spot_types_code_idx" ON "spot_types"("code");

-- CreateIndex
CREATE INDEX "parking_spots_lot_id_status_idx" ON "parking_spots"("lot_id", "status");

-- CreateIndex
CREATE INDEX "parking_spots_spot_type_id_idx" ON "parking_spots"("spot_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_spots_lot_id_spot_number_key" ON "parking_spots"("lot_id", "spot_number");

-- CreateIndex
CREATE INDEX "rates_lot_id_is_active_idx" ON "rates"("lot_id", "is_active");

-- CreateIndex
CREATE INDEX "rates_rate_type_idx" ON "rates"("rate_type");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_plate_number_status_idx" ON "tickets"("plate_number", "status");

-- CreateIndex
CREATE INDEX "tickets_entry_time_idx" ON "tickets"("entry_time");

-- CreateIndex
CREATE INDEX "tickets_lot_id_status_idx" ON "tickets"("lot_id", "status");

-- CreateIndex
CREATE INDEX "tickets_client_id_idx" ON "tickets"("client_id");

-- CreateIndex
CREATE INDEX "tickets_vehicle_id_idx" ON "tickets"("vehicle_id");

-- CreateIndex
CREATE INDEX "tickets_qr_hash_idx" ON "tickets"("qr_hash");

-- CreateIndex
CREATE INDEX "tickets_status_payment_status_idx" ON "tickets"("status", "payment_status");

-- CreateIndex
CREATE INDEX "payments_ticket_id_idx" ON "payments"("ticket_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");

-- CreateIndex
CREATE INDEX "cash_registers_lot_id_status_idx" ON "cash_registers"("lot_id", "status");

-- CreateIndex
CREATE INDEX "cash_registers_opened_at_idx" ON "cash_registers"("opened_at");

-- CreateIndex
CREATE INDEX "cash_register_movements_cash_register_id_idx" ON "cash_register_movements"("cash_register_id");

-- CreateIndex
CREATE INDEX "cash_register_movements_created_at_idx" ON "cash_register_movements"("created_at");

-- CreateIndex
CREATE INDEX "subscriptions_client_id_idx" ON "subscriptions"("client_id");

-- CreateIndex
CREATE INDEX "subscriptions_vehicle_id_idx" ON "subscriptions"("vehicle_id");

-- CreateIndex
CREATE INDEX "subscriptions_lot_id_status_idx" ON "subscriptions"("lot_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_end_date_idx" ON "subscriptions"("end_date");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "reservations_lot_id_date_idx" ON "reservations"("lot_id", "date");

-- CreateIndex
CREATE INDEX "reservations_client_id_idx" ON "reservations"("client_id");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "access_logs_ticket_id_idx" ON "access_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "access_logs_access_time_idx" ON "access_logs"("access_time");

-- CreateIndex
CREATE INDEX "access_logs_event_type_idx" ON "access_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE INDEX "printer_configs_lot_id_is_default_idx" ON "printer_configs"("lot_id", "is_default");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spots" ADD CONSTRAINT "parking_spots_spot_type_id_fkey" FOREIGN KEY ("spot_type_id") REFERENCES "spot_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_spot_type_id_fkey" FOREIGN KEY ("spot_type_id") REFERENCES "spot_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "parking_spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_entry_operator_id_fkey" FOREIGN KEY ("entry_operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_exit_operator_id_fkey" FOREIGN KEY ("exit_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_entry_cash_register_id_fkey" FOREIGN KEY ("entry_cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_configs" ADD CONSTRAINT "printer_configs_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_configs" ADD CONSTRAINT "printer_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
