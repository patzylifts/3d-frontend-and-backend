// src/utils/auth.js

const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

/* ──────────────────────────────────────────────
   TOKEN STORAGE
   ────────────────────────────────────────────── */

export const saveTokens = (tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
};

export const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};

export const getAccessToken = () => localStorage.getItem("access_token");
export const getRefreshToken = () => localStorage.getItem("refresh_token");
export const isLoggedIn = () => !!getAccessToken();


/* ──────────────────────────────────────────────
   TOKEN REFRESH
   Handles concurrent requests: if multiple calls
   fire at the same time while refreshing, they
   queue up and retry once the new token arrives.
   ────────────────────────────────────────────── */

let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for the new token

const notifyQueue = (newToken) => {
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
};

export const refreshAccessToken = async () => {
    const refresh = getRefreshToken();

    if (!refresh) {
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
        return null;
    }

    try {
        const res = await fetch(`${BASEURL}/api/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
        });

        if (!res.ok) {
            // Refresh token expired — force the user to log in again
            clearTokens();
            window.dispatchEvent(new Event("auth:logout"));
            return null;
        }

        const data = await res.json();
        localStorage.setItem("access_token", data.access);

        // Some backends also rotate the refresh token
        if (data.refresh) {
            localStorage.setItem("refresh_token", data.refresh);
        }

        return data.access;
    } catch (err) {
        console.error("Token refresh error:", err);
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
        return null;
    }
};


/* ──────────────────────────────────────────────
   AUTH FETCH
   - Attaches Bearer token to every request
   - On 401: refreshes token once, then retries
   - Queues concurrent requests during refresh
   ────────────────────────────────────────────── */

export const authFetch = async (url, options = {}) => {
    let token = getAccessToken();

    const buildHeaders = (tkn) => {
        const headers = { ...(options.headers || {}) };
        if (tkn) headers["Authorization"] = `Bearer ${tkn}`;
        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    };

    // First attempt
    let res = await fetch(url, {
        ...options,
        headers: buildHeaders(token),
    });

    // If 401, try to refresh
    if (res.status === 401) {
        if (isRefreshing) {
            // Another refresh is already in-flight — wait for it
            return new Promise((resolve) => {
                refreshQueue.push(async (newToken) => {
                    resolve(
                        await fetch(url, {
                            ...options,
                            headers: buildHeaders(newToken),
                        })
                    );
                });
            });
        }

        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        if (newToken) {
            notifyQueue(newToken); // unblock any queued requests
            // Retry the original request with the new token
            res = await fetch(url, {
                ...options,
                headers: buildHeaders(newToken),
            });
        }
        // If newToken is null, refreshAccessToken already fired auth:logout
    }

    return res;
};