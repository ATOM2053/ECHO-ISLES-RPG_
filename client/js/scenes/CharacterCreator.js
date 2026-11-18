/* =========================================
   ECHO ISLES RPG
   Character Creator
========================================= */

window.CharacterCreator = (() => {

    "use strict";

    let container = null;

    const options = {
        race: [
            "Human",
            "Elf",
            "Dark Elf",
            "Dwarf",
            "Beastkin",
            "Dragonkin"
        ],

        gender: [
            "Male",
            "Female"
        ],

        skin: [
            "#f5d0ad",
            "#d9a77e",
            "#a96f4f",
            "#754b39",
            "#e8c6a0"
        ],

        hair: [
            "Short",
            "Long",
            "Ponytail",
            "Messy",
            "Braided"
        ],

        hairColor: [
            "#38251d",
            "#171717",
            "#d5b56b",
            "#a83d32",
            "#e5e5e5",
            "#7651a8",
            "#315b9b"
        ],

        eyeColor: [
            "#4b8b59",
            "#4385b9",
            "#8b5737",
            "#9c7b35",
            "#8d4a9d"
        ],

        outfit: [
            "Adventurer",
            "Traveler",
            "Novice Mage",
            "Forest Ranger"
        ],

        weapon: [
            "Wooden Sword",
            "Short Bow",
            "Apprentice Staff",
            "Dagger",
            "None"
        ]
    };

    const character = {
        name: "",
        race: "Human",
        gender: "Male",
        skin: "#f5d0ad",
        hair: "Short",
        hairColor: "#38251d",
        eyeColor: "#4385b9",
        outfit: "Adventurer",
        weapon: "Wooden Sword"
    };

    // สร้างหน้าจอ
    function createScreen() {

        if (container) return;

        container = document.createElement("div");

        container.id = "character-creator";

        Object.assign(container.style, {
            position: "fixed",
            inset: "0",
            zIndex: "10000",
            background: "#101522",
            color: "#ffffff",
            fontFamily: "Kanit, sans-serif",
            overflowY: "auto",
            padding: "20px",
            boxSizing: "border-box"
        });

        container.innerHTML = `
            <div style="
                max-width:1100px;
                margin:auto;
            ">

                <header style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:12px;
                    flex-wrap:wrap;
                    margin-bottom:25px;
                ">

                    <div>
                        <h1 style="
                            margin:0;
                            color:#e8c77a;
                        ">CHARACTER CREATOR</h1>

                        <p style="
                            margin:5px 0;
                            color:#aab3c5;
                        ">Create your own destiny</p>
                    </div>

                    <button id="creator-back" class="menu-button">
                        BACK
                    </button>

                </header>

                <div style="
                    display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
                    gap:25px;
                ">

                    <!-- Preview -->
                    <section style="
                        background:#1b2435;
                        border:1px solid #39445a;
                        border-radius:15px;
                        padding:20px;
                        text-align:center;
                    ">

                        <h2>Character Preview</h2>

                        <div id="character-preview" style="
                            height:320px;
                            background:linear-gradient(#263d50,#182b32);
                            border-radius:12px;
                            display:flex;
                            justify-content:center;
                            align-items:center;
                            flex-direction:column;
                            gap:15px;
                        ">

                            <canvas
                                id="creator-canvas"
                                width="256"
                                height="256"
                                style="
                                    width:256px;
                                    height:256px;
                                    image-rendering:pixelated;
                                "
                            ></canvas>

                            <strong id="preview-name">
                                Adventurer
                            </strong>

                        </div>

                        <p style="color:#aab3c5">
                            Character Appearance
                        </p>

                    </section>

                    <!-- Customization -->
                    <section style="
                        background:#1b2435;
                        border:1px solid #39445a;
                        border-radius:15px;
                        padding:20px;
                    ">

                        <h2>Appearance</h2>

                        <div id="creator-fields"></div>

                        <button
                            id="creator-submit"
                            style="
                                width:100%;
                                margin-top:25px;
                                padding:15px;
                                border:0;
                                border-radius:8px;
                                background:#c49b50;
                                color:#171717;
                                font-size:17px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            CREATE CHARACTER
                        </button>

                    </section>

                </div>

            </div>
        `;

        document.body.appendChild(container);

        document.getElementById("creator-back")
            .addEventListener("click", close);

        document.getElementById("creator-submit")
            .addEventListener("click", submit);

        renderFields();

        renderPreview();

    }

    // สร้างตัวเลือก
    function renderFields() {

        const fields = document.getElementById("creator-fields");

        const definitions = [
            ["name", "Character Name", "text"],
            ["race", "Race", "select"],
            ["gender", "Gender", "select"],
            ["skin", "Skin Color", "color"],
            ["hair", "Hairstyle", "select"],
            ["hairColor", "Hair Color", "color"],
            ["eyeColor", "Eye Color", "color"],
            ["outfit", "Starting Outfit", "select"],
            ["weapon", "Starting Weapon", "select"]
        ];

        fields.innerHTML = "";

        definitions.forEach(([key, label, type]) => {

            const wrapper = document.createElement("div");

            wrapper.style.marginBottom = "16px";

            const title = document.createElement("label");

            title.textContent = label;

            title.style.display = "block";
            title.style.marginBottom = "6px";

            let input;

            if (type === "select") {

                input = document.createElement("select");

                options[key].forEach(value => {

                    const option = document.createElement("option");

                    option.value = value;
                    option.textContent = value;

                    input.appendChild(option);

                });

                input.value = character[key];

            } else {

                input = document.createElement("input");

                input.type = type;

                input.value = character[key];

                if (type === "text") {
                    input.maxLength = 16;
                    input.placeholder = "Enter character name";
                }

            }

            input.dataset.key = key;

            Object.assign(input.style, {
                width: "100%",
                padding: "11px",
                boxSizing: "border-box",
                borderRadius: "7px",
                border: "1px solid #46536b",
                background: "#101827",
                color: "#ffffff",
                fontFamily: "inherit"
            });

            input.addEventListener("input", () => {

                character[key] = input.value;

                if (key === "name") {
                    document.getElementById("preview-name").textContent =
                        input.value || "Adventurer";
                }

                renderPreview();

            });

            wrapper.appendChild(title);
            wrapper.appendChild(input);

            fields.appendChild(wrapper);

        });

    }

    // วาดตัวละครตัวอย่าง
    function renderPreview() {

        const canvas = document.getElementById("creator-canvas");

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, 256, 256);

        // เงา
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(128, 221, 48, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // เสื้อผ้า
        const outfitColors = {
            "Adventurer": "#416a9e",
            "Traveler": "#92714a",
            "Novice Mage": "#74529d",
            "Forest Ranger": "#426e4c"
        };

        ctx.fillStyle = outfitColors[character.outfit] || "#416a9e";

        ctx.fillRect(91, 140, 74, 65);

        // แขน
        ctx.fillRect(78, 147, 17, 48);
        ctx.fillRect(161, 147, 17, 48);

        // มือ
        ctx.fillStyle = character.skin;

        ctx.fillRect(78, 188, 17, 12);
        ctx.fillRect(161, 188, 17, 12);

        // คอ
        ctx.fillRect(115, 122, 26, 23);

        // ศีรษะ
        ctx.fillStyle = character.skin;

        ctx.fillRect(91, 54, 74, 75);

        // หู
        ctx.fillRect(82, 82, 10, 22);
        ctx.fillRect(164, 82, 10, 22);

        // ผม
        ctx.fillStyle = character.hairColor;

        ctx.fillRect(89, 49, 78, 19);

        if (character.hair === "Long") {
            ctx.fillRect(89, 62, 13, 65);
            ctx.fillRect(154, 62, 13, 65);
        }

        if (character.hair === "Ponytail") {
            ctx.fillRect(160, 58, 18, 55);
        }

        if (character.hair === "Messy") {
            ctx.fillRect(83, 48, 14, 18);
            ctx.fillRect(150, 42, 17, 17);
        }

        if (character.hair === "Braided") {
            ctx.fillRect(85, 63, 12, 75);
            ctx.fillRect(159, 63, 12, 75);
        }

        // ดวงตา
        ctx.fillStyle = character.eyeColor;

        ctx.fillRect(106, 86, 10, 10);
        ctx.fillRect(140, 86, 10, 10);

        // รูม่านตา
        ctx.fillStyle = "#171717";

        ctx.fillRect(109, 89, 4, 4);
        ctx.fillRect(143, 89, 4, 4);

        // ปาก
        ctx.fillStyle = "#8d514d";

        ctx.fillRect(119, 111, 18, 4);

        // รองเท้า
        ctx.fillStyle = "#40352d";

        ctx.fillRect(94, 203, 27, 15);
        ctx.fillRect(135, 203, 27, 15);

        // อาวุธตัวอย่าง
        if (character.weapon !== "None") {

            ctx.fillStyle = "#c4cbd4";

            ctx.fillRect(184, 126, 6, 72);

            ctx.fillStyle = "#795334";

            ctx.fillRect(182, 190, 10, 18);

        }

    }

    // ตรวจสอบข้อมูล
    function validate() {

        const name = character.name.trim();

        if (name.length < 3) {
            alert("Character name must be at least 3 characters.");
            return false;
        }

        if (!/^[a-zA-Z0-9ก-๙ _-]+$/.test(name)) {
            alert("Invalid character name.");
            return false;
        }

        return true;

    }

    // สร้างตัวละคร
    function submit() {

        if (!validate()) return;

        const newCharacter = {
            ...character,
            name: character.name.trim()
        };

        console.log("Character Created:", newCharacter);

        window.dispatchEvent(
            new CustomEvent("character:created", {
                detail: newCharacter
            })
        );

        alert("Character design completed!");

        close();

    }

    // เปิดหน้าสร้างตัวละคร
    function open() {

        createScreen();

    }

    // ปิดหน้าสร้างตัวละคร
    function close() {

        if (!container) return;

        container.remove();

        container = null;

    }

    // รับข้อมูลตัวละคร
    function getCharacter() {

        return { ...character };

    }

    return {
        open,
        close,
        getCharacter
    };

})();

console.log("Character Creator Loaded");
