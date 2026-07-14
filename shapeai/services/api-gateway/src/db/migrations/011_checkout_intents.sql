-- Vincula um pagamento da Cakto à conta correta mesmo quando a pessoa paga com um
-- e-mail diferente do e-mail de cadastro. O app gera um token antes de abrir o
-- checkout; o token viaja na URL (src/sck) e volta no webhook.
CREATE TABLE IF NOT EXISTS checkout_intents (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checkout_intents_user ON checkout_intents(user_id);

-- Pagamentos cujo dono não pôde ser resolvido (webhook sem token e e-mail sem conta).
-- A pessoa reivindica pelo app em "Já paguei", e o suporte tem um registro auditável.
CREATE TABLE IF NOT EXISTS unclaimed_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  email          TEXT,
  expires_at     TIMESTAMPTZ,
  payload        JSONB NOT NULL,
  claimed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unclaimed_payments_email ON unclaimed_payments(LOWER(email));
