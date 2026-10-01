let ultimoTempo = 0;

/** Timestamp estritamente crescente, para desempatar ordenações por criação. */
export function proximoTempo(): number {
  ultimoTempo = Math.max(Date.now(), ultimoTempo + 1);
  return ultimoTempo;
}

export function novoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
