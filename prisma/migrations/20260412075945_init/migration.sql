-- CreateTable
CREATE TABLE "analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "input_text" TEXT NOT NULL,
    "result_meaning" TEXT NOT NULL,
    "result_urgency" TEXT NOT NULL,
    "result_action" TEXT NOT NULL,
    "result_suspicious" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL
);
