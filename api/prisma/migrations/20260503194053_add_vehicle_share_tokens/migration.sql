-- CreateTable
CREATE TABLE "vehicle_share_tokens" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_share_tokens_token_hash_key" ON "vehicle_share_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "vehicle_share_tokens" ADD CONSTRAINT "vehicle_share_tokens_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
