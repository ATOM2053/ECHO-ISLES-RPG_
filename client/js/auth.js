/* =========================================
   ECHO ISLES RPG
   ACCOUNT AUTHENTICATION SYSTEM
   Version: 1.1.0
========================================= */

"use strict";

window.ECHO_AUTH = (() => {

    const API_BASE = "/api/account";
    const TOKEN_KEY = "echo_isles_access_token";

    let account = null;

    /* =====================================
       TOKEN MANAGEMENT
    ===================================== */

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function isLoggedIn() {
        return Boolean(getToken());
    }

    function saveSession(data) {

        if (!data || !data.accessToken) {
            throw new Error("ไม่พบ Access Token");
        }

        localStorage.setItem(
            TOKEN_KEY,
            data.accessToken
        );

        account = data.account || null;
    }

    function clearSession() {

        localStorage.removeItem(TOKEN_KEY);

        account = null;

    }

    /* =====================================
       API REQUEST
    ===================================== */

    async function request(endpoint, data = null) {

        const headers = {
            "Content-Type": "application/json"
        };

        const token = getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const options = {
            method: data ? "POST" : "GET",
            headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(
            `${API_BASE}${endpoint}`,
            options
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง");
        }

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "เกิดข้อผิดพลาด"
            );

        }

        return result;

    }

    /* =====================================
       REGISTER
    ===================================== */

    async function register(username, email, password) {

        return request("/register", {
            username,
            email,
            password
        });

    }

    /* =====================================
       LOGIN
    ===================================== */

    async function login(identifier, password) {

        const result = await request("/login", {
            identifier,
            password
        });

        saveSession(result);

        return result.account;

    }

    /* =====================================
       GET PROFILE
    ===================================== */

    async function getProfile() {

        if (!getToken()) {
            return null;
        }

        try {

            const result = await request("/me");

            account = result.account;

            return account;

        } catch (error) {

            clearSession();

            return null;

        }

    }

    /* =====================================
       LOGOUT
    ===================================== */

    function logout() {

        clearSession();

        // Disconnect game socket if available
        if (
            window.ECHO_GAME &&
            window.ECHO_GAME.network &&
            window.ECHO_GAME.network.socket
        ) {

            window.ECHO_GAME.network.socket.disconnect();

            window.ECHO_GAME.network.socket = null;

            window.ECHO_GAME.state.connected = false;

        }

    }

    /* =====================================
       PUBLIC API
    ===================================== */

    return {

        register,
        login,
        getProfile,
        logout,

        getToken,
        isLoggedIn,

        get account() {
            return account;
        }

    };

})();
