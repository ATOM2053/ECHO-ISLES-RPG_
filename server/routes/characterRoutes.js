const express = require("express");

const router = express.Router();

const {
    authenticate
} = require("../middleware/authMiddleware");

const CharacterService = require("../services/CharacterService");

// ==========================================
// CHARACTER ROUTES
// ECHO ISLES RPG
// ==========================================

// ทุกเส้นทางต้องผ่านการยืนยันตัวตน
router.use(authenticate);


// ==========================================
// GET /api/characters
// ดึงรายชื่อตัวละครทั้งหมดของบัญชี
// ==========================================

router.get("/", async (req, res) => {
    try {
        const characters = await CharacterService.getCharacters(
            req.account.id
        );

        return res.status(200).json({
            success: true,
            characters
        });

    } catch (error) {
        console.error("[CHARACTER] Get characters error:", error);

        return res.status(500).json({
            success: false,
            code: "CHARACTER_LIST_FAILED",
            message: "ไม่สามารถโหลดรายชื่อตัวละครได้"
        });
    }
});


// ==========================================
// GET /api/characters/:characterId
// ดูข้อมูลตัวละครหนึ่งตัว
// ==========================================

router.get("/:characterId", async (req, res) => {
    try {
        const character = await CharacterService.getCharacter(
            req.account.id,
            req.params.characterId
        );

        if (!character) {
            return res.status(404).json({
                success: false,
                code: "CHARACTER_NOT_FOUND",
                message: "ไม่พบตัวละครนี้"
            });
        }

        return res.status(200).json({
            success: true,
            character
        });

    } catch (error) {
        console.error("[CHARACTER] Get character error:", error);

        return res.status(500).json({
            success: false,
            code: "CHARACTER_LOAD_FAILED",
            message: "ไม่สามารถโหลดข้อมูลตัวละครได้"
        });
    }
});


// ==========================================
// POST /api/characters
// สร้างตัวละครใหม่
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            name,
            race,
            gender
        } = req.body || {};

        const character = await CharacterService.createCharacter(
            req.account.id,
            {
                name,
                race,
                gender
            }
        );

        return res.status(201).json({
            success: true,
            message: "สร้างตัวละครสำเร็จ",
            character
        });

    } catch (error) {
        console.error("[CHARACTER] Create character error:", error);

        const errorCode = error.code || error.message;

        const errorResponses = {
            INVALID_CHARACTER_NAME: {
                status: 400,
                message: "ชื่อตัวละครไม่ถูกต้อง"
            },

            INVALID_CHARACTER_RACE: {
                status: 400,
                message: "เผ่าพันธุ์ตัวละครไม่ถูกต้อง"
            },

            INVALID_CHARACTER_GENDER: {
                status: 400,
                message: "เพศตัวละครไม่ถูกต้อง"
            },

            MAX_CHARACTERS_REACHED: {
                status: 400,
                message: "คุณมีตัวละครครบจำนวนที่กำหนดแล้ว"
            },

            CHARACTER_NAME_ALREADY_EXISTS: {
                status: 409,
                message: "ชื่อตัวละครนี้มีผู้ใช้งานแล้ว"
            }
        };

        const response = errorResponses[errorCode];

        if (response) {
            return res.status(response.status).json({
                success: false,
                code: errorCode,
                message: response.message
            });
        }

        return res.status(500).json({
            success: false,
            code: "CHARACTER_CREATE_FAILED",
            message: "ไม่สามารถสร้างตัวละครได้"
        });
    }
});


// ==========================================
// EXPORT
// ==========================================

module.exports = router;
