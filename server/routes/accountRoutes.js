/* =========================================
   ECHO ISLES RPG
   ACCOUNT API ROUTES
   Version: 1.1.0
========================================= */

"use strict";

const express = require("express");

const AccountService = require("../services/AccountService");
const TokenService = require("../services/TokenService");

const {
    authenticate
} = require("../middleware/authMiddleware");

const {
    authenticationLimiter,
    registrationLimiter
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

/* =========================================
   ERROR HANDLER
========================================= */

function handleAccountError(error, res) {

    const errors = {
        INVALID_USERNAME: [400, "ชื่อผู้ใช้ไม่ถูกต้อง"],
        INVALID_EMAIL: [400, "อีเมลไม่ถูกต้อง"],
        INVALID_PASSWORD: [400, "รหัสผ่านต้องมีความยาว 8-128 ตัวอักษร"],
        ACCOUNT_ALREADY_EXISTS: [409, "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว"],
        INVALID_LOGIN: [401, "ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง"],
        ACCOUNT_BANNED: [403, "บัญชีถูกระงับการใช้งาน"]
    };

    const knownError = errors[error.message];

    if (knownError) {

        return res.status(knownError[0]).json({
            success: false,
            code: error.message,
            message: knownError[1]
        });

    }

    console.error("[ACCOUNT ROUTES]", error);

    return res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์"
    });

}

/* =========================================
   REGISTER
   POST /api/account/register
========================================= */

router.post(
    "/register",
    registrationLimiter,
    async (req, res) => {

        try {

            const {
                username,
                email,
                password
            } = req.body || {};

            const result = await AccountService.register(
                username,
                email,
                password
            );

            return res.status(201).json({

                success: true,

                message: "สมัครสมาชิกสำเร็จ",

                account: result.account

            });

        } catch (error) {

            return handleAccountError(error, res);

        }

    }
);

/* =========================================
   LOGIN
   POST /api/account/login
========================================= */

router.post(
    "/login",
    authenticationLimiter,
    async (req, res) => {

        try {

            const {
                identifier,
                password
            } = req.body || {};

            const result = await AccountService.login(
                identifier,
                password
            );

            const accessToken = TokenService.createToken(
                result.account
            );

            return res.json({

                success: true,

                message: "เข้าสู่ระบบสำเร็จ",

                account: result.account,

                accessToken,

                tokenType: "Bearer",

                expiresIn:
                    TokenService.settings.expiresInSeconds

            });

        } catch (error) {

            return handleAccountError(error, res);

        }

    }
);

/* =========================================
   GET PROFILE
   GET /api/account/me
========================================= */

router.get(
    "/me",
    authenticate,
    async (req, res) => {

        try {

            const account = await AccountService.getAccount(
                req.account.id
            );

            if (!account) {

                return res.status(404).json({

                    success: false,

                    code: "ACCOUNT_NOT_FOUND",

                    message: "ไม่พบบัญชีผู้เล่น"

                });

            }

            return res.json({

                success: true,

                account

            });

        } catch (error) {

            return handleAccountError(error, res);

        }

    }
);

/* =========================================
   EXPORT
========================================= */

module.exports = router;
