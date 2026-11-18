/* =========================================
   ECHO ISLES RPG
   TOKEN SERVICE
   Version: 1.0.0
========================================= */

"use strict";

const crypto = require("crypto");

const TokenService = {

    settings: {
        expiresInSeconds: 60 * 60 * 24,
        issuer: "echo-isles-rpg"
    },

    /* =====================================
       GET SECRET
    ===================================== */

    getSecret() {

        const secret = process.env.JWT_SECRET;

        if (!secret || secret.length < 32) {
            throw new Error(
                "JWT_SECRET_MUST_BE_AT_LEAST_32_CHARACTERS"
            );
        }

        return secret;

    },

    /* =====================================
       BASE64URL
    ===================================== */

    encode(data) {

        return Buffer
            .from(data)
            .toString("base64url");

    },

    /* =====================================
       CREATE SIGNATURE
    ===================================== */

    sign(payload) {

        return crypto
            .createHmac("sha256", this.getSecret())
            .update(payload)
            .digest("base64url");

    },

    /* =====================================
       CREATE TOKEN
    ===================================== */

    createToken(account) {

        if (!account || !account.id) {
            throw new Error("INVALID_ACCOUNT");
        }

        const now = Math.floor(Date.now() / 1000);

        const payload = {
            sub: String(account.id),
            username: account.username,
            iss: this.settings.issuer,
            iat: now,
            exp: now + this.settings.expiresInSeconds
        };

        const encodedPayload = this.encode(
            JSON.stringify(payload)
        );

        const signature = this.sign(encodedPayload);

        return `${encodedPayload}.${signature}`;

    },

    /* =====================================
       VERIFY TOKEN
    ===================================== */

    verifyToken(token) {

        if (
            typeof token !== "string" ||
            token.length > 4096
        ) {
            return null;
        }

        const parts = token.split(".");

        if (parts.length !== 2) {
            return null;
        }

        const [encodedPayload, signature] = parts;

        try {

            const expectedSignature = this.sign(
                encodedPayload
            );

            const receivedBuffer = Buffer.from(
                signature,
                "base64url"
            );

            const expectedBuffer = Buffer.from(
                expectedSignature,
                "base64url"
            );

            if (
                receivedBuffer.length !== expectedBuffer.length ||
                !crypto.timingSafeEqual(
                    receivedBuffer,
                    expectedBuffer
                )
            ) {
                return null;
            }

            const payload = JSON.parse(
                Buffer
                    .from(encodedPayload, "base64url")
                    .toString("utf8")
            );

            const now = Math.floor(Date.now() / 1000);

            if (
                !payload.sub ||
                payload.iss !== this.settings.issuer ||
                !Number.isInteger(payload.exp) ||
                !Number.isInteger(payload.iat) ||
                payload.exp <= now ||
                payload.iat > now + 60
            ) {
                return null;
            }

            return {
                accountId: payload.sub,
                username: payload.username,
                issuedAt: payload.iat,
                expiresAt: payload.exp
            };

        } catch (error) {

            return null;

        }

    }

};

module.exports = TokenService;
