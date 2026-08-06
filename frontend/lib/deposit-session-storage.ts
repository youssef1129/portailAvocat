// In-memory deposit session token storage — intentionally NOT persisted
let depositSessionToken: string | null = null;

type Subscriber = (token: string | null) => void;
const subscribers = new Set<Subscriber>();

export function setDepositSessionToken(token: string | null) {
  depositSessionToken = token;
  subscribers.forEach((s) => s(token));
}

export function getDepositSessionToken(): string | null {
  return depositSessionToken;
}

export function clearDepositSessionToken() {
  setDepositSessionToken(null);
}

export function subscribeToDepositSession(sub: Subscriber) {
  subscribers.add(sub);
  // return unsubscribe
  return () => subscribers.delete(sub);
}

export default {
  setDepositSessionToken,
  getDepositSessionToken,
  clearDepositSessionToken,
  subscribeToDepositSession,
};
