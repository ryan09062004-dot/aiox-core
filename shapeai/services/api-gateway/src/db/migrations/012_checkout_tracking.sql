-- Rastreamento de conversão do Meta (Pixel + Conversions API).
--
-- Estes campos viajam com o token de checkout através do salto de domínio para a Cakto:
-- o app captura _fbp/_fbc e gera um event_id no clique de "assinar", grava tudo aqui, e
-- o webhook os reutiliza para disparar o Purchase server-side via CAPI com o MESMO
-- event_id — o que permite ao Meta deduplicar o evento de browser (InitiateCheckout)
-- com o de servidor (Purchase). É o que resolve a atribuição furada: o cookie do Pixel
-- não atravessa para pay.cakto.com.br, mas o token já atravessa.
--
-- client_ip e user_agent são capturados server-side no /subscription/checkout porque
-- melhoram a Qualidade da Correspondência do Meta no evento server-side.
ALTER TABLE checkout_intents
  ADD COLUMN IF NOT EXISTS fbp        TEXT,
  ADD COLUMN IF NOT EXISTS fbc        TEXT,
  ADD COLUMN IF NOT EXISTS event_id   TEXT,
  ADD COLUMN IF NOT EXISTS client_ip  TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;
