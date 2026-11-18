/* =========================================
   ECHO ISLES RPG
   Character Appearance System
========================================= */

window.CharacterAppearanceSystem = (() => {

    "use strict";

    const RACES = {
        Human: {
            name: "Human",
            skinColors: ["#f5d0ad", "#d9a77e", "#a96f4f"],
            earType: "human",
            features: ["normal"]
        },

        Elf: {
            name: "Elf",
            skinColors: ["#f2dfc2", "#d6bd9e", "#b8a58e"],
            earType: "pointed",
            features: ["pointed_ears"]
        },

        "Dark Elf": {
            name: "Dark Elf",
            skinColors: ["#9275a5", "#765a91", "#59436e"],
            earType: "pointed",
            features: ["pointed_ears"]
        },

        Dwarf: {
            name: "Dwarf",
            skinColors: ["#e2b58e", "#bb8966", "#94664b"],
            earType: "round",
            features: ["stocky_build"]
        },

        Beastkin: {
            name: "Beastkin",
            skinColors: ["#e6c5a0", "#c99775", "#a97958"],
            earType: "animal",
            features: ["animal_ears"]
        },

        Dragonkin: {
            name: "Dragonkin",
            skinColors: ["#a9b6a0", "#829d91", "#a98b7b"],
            earType: "dragon",
            features: ["dragon_scales"]
        }
    };

    const DEFAULT_APPEARANCE = {
        race: "Human",
        gender: "Male",
        skin: "#f5d0ad",
        hair: "Short",
        hairColor: "#38251d",
        eyeColor: "#4385b9",
        outfit: "Adventurer",
        weapon: "Wooden Sword",

        equipment: {
            helmet: null,
            armor: null,
            gloves: null,
            boots: null,
            weapon: null,
            necklace: null,
            ring: null
        }
    };

    const appearances = new Map();

    // สร้างข้อมูลรูปลักษณ์
    function create(data = {}) {

        return {
            ...structuredClone(DEFAULT_APPEARANCE),
            ...data,

            equipment: {
                ...DEFAULT_APPEARANCE.equipment,
                ...(data.equipment || {})
            }
        };

    }

    // กำหนดรูปลักษณ์ให้ตัวละคร
    function setAppearance(playerId, data = {}) {

        if (!playerId) return null;

        const appearance = create(data);

        if (!RACES[appearance.race]) {
            appearance.race = "Human";
        }

        appearances.set(playerId, appearance);

        return getAppearance(playerId);

    }

    // รับข้อมูลรูปลักษณ์
    function getAppearance(playerId) {

        const appearance = appearances.get(playerId);

        if (!appearance) return null;

        return structuredClone(appearance);

    }

    // เปลี่ยนทรงผม
    function setHair(playerId, hair, color) {

        const appearance = appearances.get(playerId);

        if (!appearance) return false;

        appearance.hair = hair;

        if (color) {
            appearance.hairColor = color;
        }

        return true;

    }

    // เปลี่ยนสีผิว
    function setSkin(playerId, color) {

        const appearance = appearances.get(playerId);

        if (!appearance) return false;

        appearance.skin = color;

        return true;

    }

    // เปลี่ยนสีดวงตา
    function setEyeColor(playerId, color) {

        const appearance = appearances.get(playerId);

        if (!appearance) return false;

        appearance.eyeColor = color;

        return true;

    }

    // เปลี่ยนเผ่าพันธุ์
    function setRace(playerId, race) {

        const appearance = appearances.get(playerId);

        if (!appearance || !RACES[race]) {
            return false;
        }

        appearance.race = race;

        return true;

    }

    // สวมใส่อุปกรณ์
    function equip(playerId, slot, item) {

        const appearance = appearances.get(playerId);

        if (!appearance) return false;

        if (!Object.prototype.hasOwnProperty.call(
            appearance.equipment,
            slot
        )) {
            return false;
        }

        appearance.equipment[slot] = item;

        return true;

    }

    // ถอดอุปกรณ์
    function unequip(playerId, slot) {

        const appearance = appearances.get(playerId);

        if (!appearance) return false;

        if (!Object.prototype.hasOwnProperty.call(
            appearance.equipment,
            slot
        )) {
            return false;
        }

        appearance.equipment[slot] = null;

        return true;

    }

    // รับข้อมูลเผ่าพันธุ์
    function getRaceData(race) {

        return RACES[race] || RACES.Human;

    }

    // ลบข้อมูลรูปลักษณ์
    function remove(playerId) {

        appearances.delete(playerId);

    }

    // API ระบบ
    return {

        RACES,

        create,

        setAppearance,

        getAppearance,

        setHair,

        setSkin,

        setEyeColor,

        setRace,

        equip,

        unequip,

        getRaceData,

        remove

    };

})();

console.log("Character Appearance System Loaded");
