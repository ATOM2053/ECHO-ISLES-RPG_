/* =========================================
   ECHO ISLES RPG
   CHARACTER MANAGEMENT SYSTEM
   Version: 1.1.0
========================================= */

"use strict";

window.ECHO_CHARACTERS = (() => {

    const API_URL = "/api/characters";

    // อาชีพที่ระบบรองรับ
    const JOBS = [
        "Adventurer",
        "Swordsman",
        "Knight",
        "Archer",
        "Mage",
        "Assassin",
        "Priest"
    ];

    async function request(endpoint = "", options = {}) {

        const token = window.ECHO_AUTH.getToken();

        if (!token) {
            throw new Error("กรุณาเข้าสู่ระบบก่อน");
        }

        const response = await fetch(
            API_URL + endpoint,
            {
                ...options,

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    ...(options.headers || {})
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "เกิดข้อผิดพลาด"
            );
        }

        return result;

    }

    // =====================================
    // โหลดตัวละครทั้งหมด
    // =====================================

    async function getAll() {

        const result = await request();

        return result.characters;

    }

    // =====================================
    // โหลดข้อมูลตัวละคร
    // =====================================

    async function getById(characterId) {

        if (!characterId) {
            throw new Error("ไม่พบรหัสตัวละคร");
        }

        const result = await request(
            "/" + encodeURIComponent(characterId)
        );

        return result.character;

    }

    // =====================================
    // สร้างตัวละคร
    // =====================================

    async function create(data) {

        if (!data || typeof data !== "object") {
            throw new Error("ข้อมูลตัวละครไม่ถูกต้อง");
        }

        const name = data.name?.trim();
        const race = data.race;
        const gender = data.gender;
        const job = data.job || "Adventurer";

        if (!name) {
            throw new Error("กรุณากรอกชื่อตัวละคร");
        }

        if (!race) {
            throw new Error("กรุณาเลือกเผ่าพันธุ์");
        }

        if (!gender) {
            throw new Error("กรุณาเลือกเพศ");
        }

        if (!JOBS.includes(job)) {
            throw new Error("กรุณาเลือกอาชีพที่ถูกต้อง");
        }

        const result = await request("", {

            method: "POST",

            body: JSON.stringify({

                name,
                race,
                gender,
                job

            })

        });

        return result.character;

    }

    // =====================================
    // EXPORT
    // =====================================

    return {

        getAll,
        getById,
        create,

        jobs: JOBS

    };

})();
