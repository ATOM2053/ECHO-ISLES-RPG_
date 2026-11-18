/* =========================================
   ECHO ISLES RPG
   ACCOUNT AUTHENTICATION SYSTEM
   Version: 1.0.0
========================================= */

"use strict";

window.ECHO_AUTH = (() => {

    const API_BASE = "/api/account";
    const TOKEN_KEY = "echo_isles_access_token";

    let account = null;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function saveSession(data) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        account = data.account;
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        account = null;
    }

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

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "เกิดข้อผิดพลาด"
            );
        }

        return result;
    }

    async function register(username, email, password) {

        return request("/register", {
            username,
            email,
            password
        });

    }

    async function login(identifier, password) {

        const result = await request("/login", {
            identifier,
            password
        });

        saveSession(result);

        return result.account;
    }

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

    function logout() {
        clearSession();
    }

    return {

        register,
        login,
        getProfile,
        logout,
        getToken,

        get account() {
            return account;
        }

    };

})();
