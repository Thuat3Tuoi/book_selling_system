-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);
