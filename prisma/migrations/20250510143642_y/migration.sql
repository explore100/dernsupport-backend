/*
  Warnings:

  - Added the required column `address` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `user` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "contact" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;
