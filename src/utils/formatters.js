/**
 * Padroniza o número de WhatsApp para o formato: 55DDD9XXXXXXXX (13 dígitos)
 * Exemplo: "(11) 99229-4869" -> "5511992294869"
 */
export const formatWhatsAppToAPI = (value) => {
  if (!value) return "";

  // 1. Remove tudo que não for número
  let cleaned = value.replace(/\D/g, '');

  // 2. Se o usuário não digitou o 55 (DDI), nós adicionamos
  if (cleaned.length <= 11 && cleaned.length > 0) {
    cleaned = '55' + cleaned;
  }

  // 3. Garante o "9" após o DDD (Posição 4 da string 55DD...)
  // Se tiver 12 dígitos (55 + DDD + 8 números), inserimos o 9
  if (cleaned.length === 12) {
    cleaned = cleaned.slice(0, 4) + '9' + cleaned.slice(4);
  }

  return cleaned;
};