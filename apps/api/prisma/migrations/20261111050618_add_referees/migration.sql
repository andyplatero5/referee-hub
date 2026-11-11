-- CreateTable
CREATE TABLE "categories" (
    "id" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "level" SMALLINT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "city" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" SMALLINT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_expires_on" DATE NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referee_conflicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referee_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referee_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_level_key" ON "categories"("level");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "referees_user_id_key" ON "referees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referees_license_number_key" ON "referees"("license_number");

-- CreateIndex
CREATE INDEX "referees_category_id_idx" ON "referees"("category_id");

-- CreateIndex
CREATE INDEX "referee_conflicts_team_id_idx" ON "referee_conflicts"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "referee_conflicts_referee_id_team_id_key" ON "referee_conflicts"("referee_id", "team_id");

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_conflicts" ADD CONSTRAINT "referee_conflicts_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_conflicts" ADD CONSTRAINT "referee_conflicts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones que Prisma no expresa (ver docs/modelo-datos.md)
ALTER TABLE "categories" ADD CONSTRAINT "categories_level_positive_check" CHECK ("level" > 0);
ALTER TABLE "teams" ADD CONSTRAINT "teams_name_not_blank_check" CHECK (length(trim("name")) > 0);
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_not_blank_check" CHECK (length(trim("club")) > 0);
ALTER TABLE "referees" ADD CONSTRAINT "referees_license_number_not_blank_check" CHECK (length(trim("license_number")) > 0);
ALTER TABLE "referee_conflicts" ADD CONSTRAINT "referee_conflicts_reason_not_blank_check" CHECK (length(trim("reason")) > 0);

-- Datos de referencia: categorías de menor a mayor (R5 compara por level)
INSERT INTO "categories" ("id", "name", "level") VALUES
  (1, 'Regional', 1),
  (2, 'Nacional', 2),
  (3, 'Primera División', 3),
  (4, 'Internacional', 4);
