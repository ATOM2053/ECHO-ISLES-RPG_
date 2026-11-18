/* =========================================
   ECHO ISLES RPG
   CHARACTER MANAGEMENT SYSTEM
   Version: 1.0.0
========================================= */

"use strict";

window.ECHO_CHARACTERS = (() => {

    const API_URL = "/api/characters";

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

    // โหลดตัวละครทั้งหมด
    async function getAll() {

        const result = await request();

        return result.characters;

    }

    // โหลดข้อมูลตัวละคร
    async function getById(characterId) {

        const result = await request(
            "/" + encodeURIComponent(characterId)
        );

        return result.character;

    }

    // สร้างตัวละคร
    async function create(data) {

        const result = await request("", {

            method: "POST",

            body: JSON.stringify({

                name: data.name,
                race: data.race,
                gender: data.gender

            })

        });

        return result.character;

    }

    return {

        getAll,
        getById,
        create

    };

})();
