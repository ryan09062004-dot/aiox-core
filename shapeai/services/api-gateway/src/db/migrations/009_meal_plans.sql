CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal VARCHAR(30) NOT NULL,
  height_cm SMALLINT NOT NULL,
  weight_kg SMALLINT NOT NULL,
  sex CHAR(1) NOT NULL,
  meals JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_plans_user_id_idx ON meal_plans(user_id);
