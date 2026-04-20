const KEY = "safety_tour_auth";

export function setTokens(tokens) {
    localStorage.setItem(KEY, JSON.stringify(tokens));
}

export function getTokens() {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
    localStorage.removeItem(KEY);
}
