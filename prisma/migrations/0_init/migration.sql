-- CreateEnum
CREATE TYPE "CtaType" AS ENUM ('LINK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'SCAN_QR', 'WORKING', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "ctaUrl" TEXT,
    "ctaType" "CtaType" NOT NULL DEFAULT 'LINK',
    "ctaPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loopDays" INTEGER NOT NULL,
    "publishTime" TEXT NOT NULL DEFAULT '09:00',
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WahaSession" (
    "id" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "displayName" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "proxyId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WahaSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionBrand" (
    "sessionId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionBrand_pkey" PRIMARY KEY ("sessionId","brandId")
);

-- CreateTable
CREATE TABLE "Proxy" (
    "id" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "maxSessions" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WahaSession_sessionName_key" ON "WahaSession"("sessionName");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WahaSession" ADD CONSTRAINT "WahaSession_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES "Proxy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBrand" ADD CONSTRAINT "SessionBrand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WahaSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBrand" ADD CONSTRAINT "SessionBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishLog" ADD CONSTRAINT "PublishLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishLog" ADD CONSTRAINT "PublishLog_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishLog" ADD CONSTRAINT "PublishLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WahaSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
