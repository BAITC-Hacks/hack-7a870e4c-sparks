-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('employee', 'hr');

-- CreateTable
CREATE TABLE "DatasetMeta" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "DatasetMeta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleProfile" (
    "role" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "RoleProfile_pkey" PRIMARY KEY ("role","grade")
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL,
    "employeeId" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE INDEX "History_eventId_idx" ON "History"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "History_employeeId_eventId_date_key" ON "History"("employeeId", "eventId", "date");

-- CreateIndex
CREATE INDEX "Account_employeeId_idx" ON "Account"("employeeId");

-- CreateIndex
CREATE INDEX "Session_username_idx" ON "Session"("username");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_username_fkey" FOREIGN KEY ("username") REFERENCES "Account"("username") ON DELETE CASCADE ON UPDATE CASCADE;
