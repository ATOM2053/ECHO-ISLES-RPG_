/* =========================================
   ECHO ISLES RPG
   AUTHENTICATION MIDDLEWARE
   Version: 1.0.0
========================================= */

"use strict";

const TokenService = require("../services/TokenService");
const { query } = require("../database");

/* =========================================
   AUTHENTICATION
========================================= */

async function authenticate(req, res, next) {

    try {

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                code: "TOKEN_REQUIRED",
                message: "กรุณาเข้าสู่ระบบ"
            });

        }

        const token = authorization.slice(7).trim();

        const tokenData = TokenService.verifyToken(token);

        if (!tokenData) {

            return res.status(401).json({
                success: false,
                code: "INVALID_TOKEN",
                message: "Token ไม่ถูกต้องหรือหมดอายุ"
            });

        }

        /* ตรวจสอบบัญชีจากฐานข้อมูล */

        const result = await query(
            `
            SELECT
                id,
                username,
                email,
                is_banned
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [tokenData.accountId]
        );

        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                code: "ACCOUNT_NOT_FOUND",
                message: "ไม่พบบัญชีผู้เล่น"
            });

        }

        const account = result.rows[0];

        if (account.is_banned) {

            return res.status(403).json({
                success: false,
                code: "ACCOUNT_BANNED",
                message: "บัญชีนี้ถูกระงับการใช้งาน"
            });

        }

        /* แนบข้อมูลบัญชีเข้ากับ Request */

        req.account = {
            id: account.id,
            username: account.username,
            email: account.email
        };

        req.token = {
            issuedAt: tokenData.issuedAt,
            expiresAt: tokenData.expiresAt
        };

        next();

    } catch (error) {

        console.error(
            "[AUTH MIDDLEWARE]",
            error.message
        );

        return res.status(500).json({
            success: false,
            code: "AUTHENTICATION_ERROR",
            message: "เกิดข้อผิดพลาดในการตรวจสอบบัญชี"
        });

    }

}

/* =========================================
   OPTIONAL AUTHENTICATION
========================================= */

async function optionalAuthenticate(req, res, next) {

    const authorization =
        req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
        return next();
    }

    return authenticate(req, res, next);

}

/* =========================================
   EXPORT
========================================= */

module.exports = {
    authenticate,
    optionalAuthenticate
};
