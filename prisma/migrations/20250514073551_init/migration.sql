-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "scheduled" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
