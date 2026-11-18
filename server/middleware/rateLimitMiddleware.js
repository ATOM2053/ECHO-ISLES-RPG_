/* =========================================
   ECHO ISLES RPG
   RATE LIMIT MIDDLEWARE
   Version: 1.0.0
========================================= */

"use strict";

const requests = new Map();

/* =========================================
   CONFIGURATION
========================================= */

const RATE_LIMITS = {

    general: {
        windowMs: 60 * 1000,
        maxRequests: 100
    },

    authentication: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10
    },

    accountCreation: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5
    }

};

/* =========================================
   CREATE RATE LIMITER
========================================= */

function createRateLimiter(options = {}) {

    const windowMs = options.windowMs || 60000;

    const maxRequests = options.maxRequests || 100;

    const message = options.message ||
        "ส่งคำขอมากเกินไป กรุณารอสักครู่";

    return function rateLimit(req, res, next) {

        const now = Date.now();

        const ip = req.ip || req.socket.remoteAddress || "unknown";

        const key = `${ip}:${options.name || "default"}`;

        let record = requests.get(key);

        if (!record || now >= record.resetAt) {

            record = {
                count: 0,
                resetAt: now + windowMs
            };

            requests.set(key, record);

        }

        record.count++;

        const remaining = Math.max(
            0,
            maxRequests - record.count
        );

        const retryAfter = Math.max(
            1,
            Math.ceil((record.resetAt - now) / 1000)
        );

        res.setHeader(
            "RateLimit-Limit",
            maxRequests
        );

        res.setHeader(
            "RateLimit-Remaining",
            remaining
        );

        res.setHeader(
            "RateLimit-Reset",
            Math.ceil(record.resetAt / 1000)
        );

        if (record.count > maxRequests) {

            res.setHeader(
                "Retry-After",
                retryAfter
            );

            return res.status(429).json({

                success: false,

                code: "RATE_LIMIT_EXCEEDED",

                message,

                retryAfter

            });

        }

        next();

    };

}

/* =========================================
   PREDEFINED LIMITERS
========================================= */

const generalLimiter = createRateLimiter({

    ...RATE_LIMITS.general,

    name: "general"

});

const authenticationLimiter = createRateLimiter({

    ...RATE_LIMITS.authentication,

    name: "authentication",

    message: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่"

});

const registrationLimiter = createRateLimiter({

    ...RATE_LIMITS.accountCreation,

    name: "registration",

    message: "สมัครสมาชิกบ่อยเกินไป กรุณาลองใหม่ภายหลัง"

});

/* =========================================
   CLEANUP EXPIRED RECORDS
========================================= */

const cleanupTimer = setInterval(() => {

    const now = Date.now();

    for (const [key, record] of requests.entries()) {

        if (now >= record.resetAt) {
            requests.delete(key);
        }

    }

}, 60 * 1000);

if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
}

/* =========================================
   EXPORT
========================================= */

module.exports = {

    createRateLimiter,

    generalLimiter,

    authenticationLimiter,

    registrationLimiter

};
