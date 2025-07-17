-- CreateTable
CREATE TABLE "holdings_snapshots" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "btcUsd" DOUBLE PRECISION NOT NULL,
    "dirtyDollars" DOUBLE PRECISION NOT NULL,
    "dirtyEuro" DOUBLE PRECISION NOT NULL,
    "btc" DOUBLE PRECISION NOT NULL,
    "cryptoValue" DOUBLE PRECISION,
    "dcaValue" DOUBLE PRECISION,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_settings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "autoSnapshotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "preferredHour" INTEGER,
    "lastSnapshot" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snapshot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holdings_snapshots_userId_date_idx" ON "holdings_snapshots"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_settings_userId_key" ON "snapshot_settings"("userId");

-- AddForeignKey
ALTER TABLE "holdings_snapshots" ADD CONSTRAINT "holdings_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_settings" ADD CONSTRAINT "snapshot_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
