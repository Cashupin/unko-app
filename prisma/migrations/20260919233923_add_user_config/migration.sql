-- CreateTable
CREATE TABLE "UserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConfig_userId_idx" ON "UserConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfig_userId_key_key" ON "UserConfig"("userId", "key");

-- AddForeignKey
ALTER TABLE "UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
