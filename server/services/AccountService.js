/* =========================================
   ECHO ISLES RPG
   ACCOUNT SERVICE
   Version: 1.0.0
========================================= */

"use strict";

const crypto = require("crypto");
const { promisify } = require("util");

const { query } = require("../database");

const scryptAsync = promisify(crypto.scrypt);

const AccountService = {

    /* =====================================
       SETTINGS
    ===================================== */

    settings: {
        minPasswordLength: 8,
        maxPasswordLength: 128,
        minUsernameLength: 3,
        maxUsernameLength: 20,
        maxEmailLength: 254
    },

    /* =====================================
       VALIDATE USERNAME
    ===================================== */

    validateUsername(username) {

        if (typeof username !== "string") {
            return false;
        }

        const value = username.trim();

        if (
            value.length < this.settings.minUsernameLength ||
            value.length > this.settings.maxUsernameLength
        ) {
            return false;
        }

        return /^[a-zA-Z0-9_]+$/.test(value);
    },

    /* =====================================
       VALIDATE EMAIL
    ===================================== */

    validateEmail(email) {

        if (typeof email !== "string") {
            return false;
        }

        const value = email.trim();

        if (
            value.length === 0 ||
            value.length > this.settings.maxEmailLength
        ) {
            return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },

    /* =====================================
       VALIDATE PASSWORD
    ===================================== */

    validatePassword(password) {

        if (typeof password !== "string") {
            return false;
        }

        return (
            password.length >= this.settings.minPasswordLength &&
            password.length <= this.settings.maxPasswordLength
        );
    },

    /* =====================================
       HASH PASSWORD
    ===================================== */

    async hashPassword(password) {

        const salt = crypto.randomBytes(16).toString("hex");

        const derivedKey = await scryptAsync(
            password,
            salt,
            64
        );

        return `${salt}:${derivedKey.toString("hex")}`;

    },

    /* =====================================
       VERIFY PASSWORD
    ===================================== */

    async verifyPassword(password, storedHash) {

        if (
            typeof password !== "string" ||
            typeof storedHash !== "string"
        ) {
            return false;
        }

        const parts = storedHash.split(":");

        if (parts.length !== 2) {
            return false;
        }

        const [salt, originalHash] = parts;

        if (
            !/^[a-f0-9]{32}$/i.test(salt) ||
            !/^[a-f0-9]{128}$/i.test(originalHash)
        ) {
            return false;
        }

        const derivedKey = await scryptAsync(
            password,
            salt,
            64
        );

        const originalBuffer = Buffer.from(
            originalHash,
            "hex"
        );

        return crypto.timingSafeEqual(
            derivedKey,
            originalBuffer
        );

    },

    /* =====================================
       REGISTER ACCOUNT
    ===================================== */

    async register(username, email, password) {

        username = String(username || "").trim();
        email = String(email || "").trim().toLowerCase();

        if (!this.validateUsername(username)) {
            throw new Error("INVALID_USERNAME");
        }

        if (!this.validateEmail(email)) {
            throw new Error("INVALID_EMAIL");
        }

        if (!this.validatePassword(password)) {
            throw new Error("INVALID_PASSWORD");
        }

        const passwordHash = await this.hashPassword(password);

        try {

            const result = await query(
                `
                INSERT INTO users (
                    username,
                    email,
                    password_hash
                )
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    username,
                    email,
                    created_at
                `,
                [
                    username,
                    email,
                    passwordHash
                ]
            );

            return {
                success: true,
                account: result.rows[0]
            };

        } catch (error) {

            if (error.code === "23505") {
                throw new Error("ACCOUNT_ALREADY_EXISTS");
            }

            throw error;

        }

    },

    /* =====================================
       LOGIN ACCOUNT
    ===================================== */

    async login(identifier, password) {

        if (
            typeof identifier !== "string" ||
            typeof password !== "string"
        ) {
            throw new Error("INVALID_LOGIN");
        }

        const value = identifier.trim().toLowerCase();

        if (!value || !password) {
            throw new Error("INVALID_LOGIN");
        }

        const result = await query(
            `
            SELECT
                id,
                username,
                email,
                password_hash,
                is_banned
            FROM users
            WHERE LOWER(username) = $1
               OR LOWER(email) = $1
            LIMIT 1
            `,
            [value]
        );

        if (result.rows.length === 0) {
            throw new Error("INVALID_LOGIN");
        }

        const account = result.rows[0];

        if (account.is_banned) {
            throw new Error("ACCOUNT_BANNED");
        }

        const validPassword = await this.verifyPassword(
            password,
            account.password_hash
        );

        if (!validPassword) {
            throw new Error("INVALID_LOGIN");
        }

        await query(
            `
            UPDATE users
            SET last_login = NOW()
            WHERE id = $1
            `,
            [account.id]
        );

        return {
            success: true,
            account: {
                id: account.id,
                username: account.username,
                email: account.email
            }
        };

    },

    /* =====================================
       GET ACCOUNT
    ===================================== */

    async getAccount(accountId) {

        if (!accountId) {
            return null;
        }

        const result = await query(
            `
            SELECT
                id,
                username,
                email,
                created_at,
                last_login
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [accountId]
        );

        return result.rows[0] || null;

    }

};

module.exports = AccountService;
