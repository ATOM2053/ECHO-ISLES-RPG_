/* =========================================
   ECHO ISLES RPG
   PROCEDURAL WORLD RENDERER
   Version: 6.0.0

   FEATURES:
   - Procedural Pixel World
   - Tile Map
   - Collision System
   - Depth Sorting
   - Camera System
   - Multiplayer Rendering
   - Pixel Perfect
========================================= */

"use strict";

window.ECHO_WORLD_RENDERER = (() => {

    // ======================================
    // CONFIGURATION
    // ======================================

    const CONFIG = {

        VERSION: "6.0.0",

        TILE_SIZE: 16,

        MAP_WIDTH: 100,
        MAP_HEIGHT: 60,

        VIEW_WIDTH: 320,
        VIEW_HEIGHT: 180,

        PLAYER_WIDTH: 16,
        PLAYER_HEIGHT: 24,

        PLAYER_SPEED: 180,

        CAMERA_SMOOTHING: 0.15,

        SEED: 20261119,

        BACKGROUND: "#243b32"

    };


    // ======================================
    // CANVAS
    // ======================================

    let canvas = null;
    let ctx = null;

    let initialized = false;
    let running = false;

    let animationFrame = null;

    let lastFrame = 0;


    // ======================================
    // WORLD DATA
    // ======================================

    const world = {

        width:
            CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE,

        height:
            CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE,

        tiles: [],

        objects: [],

        collision: [],

        generated: false

    };


    // ======================================
    // CAMERA
    // ======================================

    const camera = {

        x: 0,
        y: 0,

        targetX: 0,
        targetY: 0

    };


    // ======================================
    // PLAYER
    // ======================================

    const player = {

        id: null,

        x: 400,
        y: 300,

        width: CONFIG.PLAYER_WIDTH,
        height: CONFIG.PLAYER_HEIGHT,

        direction: "down",

        moving: false,

        name: "Adventurer"

    };


    // ======================================
    // REMOTE PLAYERS
    // ======================================

    const remotePlayers = new Map();


    // ======================================
    // COLORS
    // ======================================

    const COLORS = {

        grass: [
            "#466f45",
            "#4b7548",
            "#507b4b",
            "#426a42"
        ],

        grassDetail: [
            "#608c50",
            "#355d3b",
            "#75965a"
        ],

        dirt: "#92724d",

        dirtLight: "#ad8960",

        water: "#326b91",

        waterLight: "#4788a8",

        waterDark: "#234f73",

        wood: "#765039",

        woodDark: "#4c352b",

        roof: "#754b45",

        roofDark: "#543634",

        stone: "#777d7c",

        stoneDark: "#4d5656",

        leaves: [
            "#285b3e",
            "#326b43",
            "#3d7848",
            "#4b8250"
        ],

        gold: "#e4c47b"

    };


    // ======================================
    // SEEDED RANDOM
    // ======================================

    let randomSeed = CONFIG.SEED;

    function random() {

        randomSeed =
            (randomSeed * 1664525 + 1013904223) %
            4294967296;

        return randomSeed / 4294967296;

    }


    function randomInt(min, max) {

        return Math.floor(
            random() * (max - min + 1)
        ) + min;

    }


    // ======================================
    // HELPERS
    // ======================================

    function clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    function tileIndex(x, y) {

        return y * CONFIG.MAP_WIDTH + x;

    }


    function inBounds(x, y) {

        return (
            x >= 0 &&
            y >= 0 &&
            x < CONFIG.MAP_WIDTH &&
            y < CONFIG.MAP_HEIGHT
        );

    }


    function tileAt(x, y) {

        if (!inBounds(x, y)) {
            return "water";
        }

        return world.tiles[tileIndex(x, y)];

    }


    function setTile(x, y, type) {

        if (!inBounds(x, y)) return;

        world.tiles[tileIndex(x, y)] = type;

    }


    // ======================================
    // DRAW PIXEL RECTANGLE
    // ======================================

    function rect(x, y, width, height, color) {

        ctx.fillStyle = color;

        ctx.fillRect(
            Math.floor(x),
            Math.floor(y),
            Math.ceil(width),
            Math.ceil(height)
        );

    }


    // ======================================
    // MAP GENERATION
    // ======================================

    function generateWorld() {

        randomSeed = CONFIG.SEED;

        world.tiles = [];
        world.objects = [];
        world.collision = [];

        world.generated = false;

        // BASE GRASS

        for (
            let y = 0;
            y < CONFIG.MAP_HEIGHT;
            y++
        ) {

            for (
                let x = 0;
                x < CONFIG.MAP_WIDTH;
                x++
            ) {

                world.tiles.push(
                    COLORS.grass[
                        randomInt(0, COLORS.grass.length - 1)
                    ]
                );

            }

        }


        // RIVER

        generateRiver();


        // VILLAGE AREA

        generateVillage();


        // ROADS

        generateRoads();


        // NATURAL OBJECTS

        generateTrees();

        generateRocks();

        generateBushes();


        // DECORATION

        generateGrassDetails();


        world.generated = true;

        console.log(
            "[WORLD] Generated:",
            world.width,
            world.height
        );

    }


    // ======================================
    // RIVER
    // ======================================

    function generateRiver() {

        let riverX = 76;

        for (
            let y = 0;
            y < CONFIG.MAP_HEIGHT;
            y++
        ) {

            riverX += randomInt(-1, 1);

            riverX = clamp(
                riverX,
                67,
                84
            );

            for (
                let offset = -2;
                offset <= 2;
                offset++
            ) {

                setTile(
                    riverX + offset,
                    y,
                    "water"
                );

            }

        }

    }


    // ======================================
    // VILLAGE
    // ======================================

    function generateVillage() {

        // Village clearing

        for (let y = 12; y <= 43; y++) {

            for (let x = 12; x <= 43; x++) {

                const dx = x - 27;
                const dy = y - 27;

                const distance =
                    Math.sqrt(dx * dx + dy * dy);

                if (distance < 18) {

                    setTile(x, y, "grass");

                }

            }

        }


        // Houses

        addHouse(17, 17, 5, 4);

        addHouse(32, 18, 5, 4);

        addHouse(17, 34, 5, 4);

        addHouse(32, 34, 5, 4);


        // Village well

        addObject({

            type: "well",

            x: 27 * 16,
            y: 27 * 16,

            width: 24,
            height: 22,

            solid: true

        });


        // Village sign

        addObject({

            type: "sign",

            x: 28 * 16,
            y: 22 * 16,

            width: 12,
            height: 16,

            solid: true

        });

    }


    // ======================================
    // ROADS
    // ======================================

    function generateRoads() {

        // Main horizontal road

        for (let x = 5; x < 67; x++) {

            for (let y = 26; y <= 28; y++) {

                setTile(x, y, "dirt");

            }

        }


        // Vertical village road

        for (let y = 10; y < 48; y++) {

            for (let x = 26; x <= 28; x++) {

                setTile(x, y, "dirt");

            }

        }


        // Road to river

        for (let x = 40; x < 74; x++) {

            setTile(x, 27, "dirt");

            setTile(x, 28, "dirt");

        }


        // Bridge

        addObject({

            type: "bridge",

            x: 72 * 16,
            y: 25 * 16,

            width: 48,
            height: 64,

            solid: false

        });

    }


    // ======================================
    // HOUSE GENERATION
    // ======================================

    function addHouse(tx, ty, width, height) {

        const x = tx * 16;
        const y = ty * 16;

        const w = width * 16;
        const h = height * 16;

        addObject({

            type: "house",

            x,
            y,

            width: w,
            height: h,

            solid: true

        });

    }


    // ======================================
    // ADD OBJECT
    // ======================================

    function addObject(object) {

        object.id =
            "object_" + world.objects.length;

        world.objects.push(object);

        if (object.solid) {

            world.collision.push({

                x: object.x,
                y: object.y,

                width: object.width,
                height: object.height,

                type: object.type

            });

        }

    }


    // ======================================
    // TREES
    // ======================================

    function generateTrees() {

        for (let i = 0; i < 170; i++) {

            const tx = randomInt(2, 97);
            const ty = randomInt(2, 57);

            // Keep village open

            if (
                tx >= 12 &&
                tx <= 43 &&
                ty >= 12 &&
                ty <= 43
            ) {
                continue;
            }

            // Keep river clear

            if (tileAt(tx, ty) === "water") {
                continue;
            }

            addObject({

                type: "tree",

                x: tx * 16,
                y: ty * 16,

                width: 24,
                height: 32,

                solid: true

            });

        }

    }


    // ======================================
    // ROCKS
    // ======================================

    function generateRocks() {

        for (let i = 0; i < 65; i++) {

            const tx = randomInt(2, 97);
            const ty = randomInt(2, 57);

            if (tileAt(tx, ty) === "water") {
                continue;
            }

            if (
                tx >= 12 &&
                tx <= 43 &&
                ty >= 12 &&
                ty <= 43
            ) {
                continue;
            }

            addObject({

                type: "rock",

                x: tx * 16,
                y: ty * 16,

                width: 16,
                height: 12,

                solid: true

            });

        }

    }


    // ======================================
    // BUSHES
    // ======================================

    function generateBushes() {

        for (let i = 0; i < 100; i++) {

            const tx = randomInt(2, 97);
            const ty = randomInt(2, 57);

            if (tileAt(tx, ty) === "water") {
                continue;
            }

            if (
                tx >= 12 &&
                tx <= 43 &&
                ty >= 12 &&
                ty <= 43
            ) {
                continue;
            }

            addObject({

                type: "bush",

                x: tx * 16,
                y: ty * 16,

                width: 16,
                height: 12,

                solid: true

            });

        }

    }


    // ======================================
    // GRASS DETAILS
    // ======================================

    function generateGrassDetails() {

        for (let i = 0; i < 550; i++) {

            const tx = randomInt(0, 99);
            const ty = randomInt(0, 59);

            if (tileAt(tx, ty) === "water") {
                continue;
            }

            addObject({

                type: "grass_detail",

                x: tx * 16 + randomInt(1, 12),
                y: ty * 16 + randomInt(1, 12),

                width: 3,
                height: 4,

                solid: false

            });

        }

    }


    // ======================================
    // DRAW TILE
    // ======================================

    function drawTile(type, x, y) {

        if (type === "water") {

            rect(x, y, 16, 16, COLORS.water);

            rect(
                x + 3,
                y + 4,
                5,
                1,
                COLORS.waterLight
            );

            rect(
                x + 10,
                y + 11,
                4,
                1,
                COLORS.waterDark
            );

            return;

        }


        if (type === "dirt") {

            rect(x, y, 16, 16, COLORS.dirt);

            rect(
                x + 3,
                y + 5,
                3,
                2,
                COLORS.dirtLight
            );

            rect(
                x + 10,
                y + 12,
                2,
                1,
                COLORS.wood
            );

            return;

        }


        rect(x, y, 16, 16, type);

    }


    // ======================================
    // DRAW TREE
    // ======================================

    function drawTree(object) {

        const x = object.x;
        const y = object.y;

        // Shadow

        rect(
            x + 2,
            y + 24,
            20,
            6,
            "rgba(0,0,0,0.25)"
        );

        // Trunk

        rect(
            x + 9,
            y + 17,
            7,
            13,
            COLORS.wood
        );

        rect(
            x + 11,
            y + 18,
            2,
            10,
            COLORS.woodDark
        );

        // Leaves

        const leaf =
            COLORS.leaves[
                Math.abs(
                    Math.floor(x + y)
                ) % COLORS.leaves.length
            ];

        rect(x + 4, y + 5, 16, 15, leaf);

        rect(x + 1, y + 10, 22, 9, leaf);

        rect(x + 7, y + 1, 12, 10, leaf);

        rect(x + 6, y + 7, 5, 4, "#6b9959");

        rect(x + 15, y + 12, 4, 3, "#285b3e");

    }


    // ======================================
    // DRAW ROCK
    // ======================================

    function drawRock(object) {

        const x = object.x;
        const y = object.y;

        rect(
            x + 2,
            y + 8,
            12,
            4,
            "rgba(0,0,0,0.25)"
        );

        rect(
            x + 2,
            y + 4,
            12,
            7,
            COLORS.stone
        );

        rect(
            x + 5,
            y + 1,
            7,
            8,
            COLORS.stone
        );

        rect(
            x + 5,
            y + 3,
            4,
            2,
            "#a1a8a2"
        );

        rect(
            x + 11,
            y + 6,
            2,
            3,
            COLORS.stoneDark
        );

    }


    // ======================================
    // DRAW BUSH
    // ======================================

    function drawBush(object) {

        const x = object.x;
        const y = object.y;

        rect(
            x + 2,
            y + 7,
            12,
            5,
            "#285b3e"
        );

        rect(
            x + 4,
            y + 3,
            8,
            7,
            "#3d7848"
        );

        rect(
            x + 5,
            y + 4,
            3,
            2,
            "#79a85b"
        );

    }


    // ======================================
    // DRAW HOUSE
    // ======================================

    function drawHouse(object) {

        const x = object.x;
        const y = object.y;

        const w = object.width;
        const h = object.height;

        // Shadow

        rect(
            x - 2,
            y + h - 3,
            w + 5,
            8,
            "rgba(0,0,0,0.25)"
        );

        // Wall

        rect(
            x + 3,
            y + 17,
            w - 6,
            h - 17,
            "#c49a6c"
        );

        rect(
            x + 5,
            y + 20,
            w - 10,
            h - 23,
            "#d4ad7d"
        );

        // Roof

        rect(
            x,
            y + 7,
            w,
            15,
            COLORS.roof
        );

        rect(
            x + 4,
            y + 1,
            w - 8,
            10,
            COLORS.roof
        );

        rect(
            x + 2,
            y + 8,
            w - 4,
            3,
            COLORS.roofDark
        );

        // Door

        rect(
            x + w / 2 - 4,
            y + h - 18,
            9,
            18,
            COLORS.woodDark
        );

        rect(
            x + w / 2 - 2,
            y + h - 15,
            5,
            12,
            COLORS.wood
        );

        // Window

        rect(
            x + 8,
            y + 25,
            9,
            9,
            "#315d78"
        );

        rect(
            x + 9,
            y + 26,
            7,
            7,
            "#76a9bd"
        );

        rect(
            x + 12,
            y + 26,
            1,
            7,
            COLORS.woodDark
        );

    }


    // ======================================
    // DRAW WELL
    // ======================================

    function drawWell(object) {

        const x = object.x;
        const y = object.y;

        rect(
            x + 2,
            y + 15,
            22,
            5,
            "rgba(0,0,0,0.25)"
        );

        rect(
            x + 3,
            y + 7,
            18,
            13,
            COLORS.stone
        );

        rect(
            x + 5,
            y + 9,
            14,
            9,
            "#315f75"
        );

        rect(
            x + 2,
            y + 5,
            22,
            4,
            "#a6aaa0"
        );

        rect(
            x + 5,
            y + 2,
            2,
            5,
            COLORS.wood
        );

        rect(
            x + 17,
            y + 2,
            2,
            5,
            COLORS.wood
        );

    }


    // ======================================
    // DRAW SIGN
    // ======================================

    function drawSign(object) {

        const x = object.x;
        const y = object.y;

        rect(
            x + 5,
            y + 8,
            3,
            8,
            COLORS.woodDark
        );

        rect(
            x,
            y + 2,
            13,
            7,
            COLORS.wood
        );

        rect(
            x + 2,
            y + 4,
            9,
            2,
            COLORS.gold
        );

    }


    // ======================================
    // DRAW BRIDGE
    // ======================================

    function drawBridge(object) {

        const x = object.x;
        const y = object.y;

        rect(
            x + 3,
            y,
            object.width - 6,
            object.height,
            "#69462f"
        );

        for (
            let i = 0;
            i < object.height;
            i += 8
        ) {

            rect(
                x + 3,
                y + i,
                object.width - 6,
                2,
                "#b18a5e"
            );

        }

        rect(
            x,
            y,
            4,
            object.height,
            "#4b3528"
        );

        rect(
            x + object.width - 4,
            y,
            4,
            object.height,
            "#4b3528"
        );

    }


    // ======================================
    // DRAW GRASS DETAIL
    // ======================================

    function drawGrassDetail(object) {

        rect(
            object.x,
            object.y,
            2,
            3,
            "#9ab56a"
        );

    }


    // ======================================
    // DRAW OBJECT
    // ======================================

    function drawObject(object) {

        switch (object.type) {

            case "tree":
                drawTree(object);
                break;

            case "rock":
                drawRock(object);
                break;

            case "bush":
                drawBush(object);
                break;

            case "house":
                drawHouse(object);
                break;

            case "well":
                drawWell(object);
                break;

            case "sign":
                drawSign(object);
                break;

            case "bridge":
                drawBridge(object);
                break;

            case "grass_detail":
                drawGrassDetail(object);
                break;

        }

    }


    // ======================================
    // COLLISION SYSTEM
    // ======================================

    function canMoveTo(x, y) {

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return false;
        }

        const halfWidth =
            CONFIG.PLAYER_WIDTH / 2 - 2;

        const halfHeight =
            CONFIG.PLAYER_HEIGHT / 2 - 2;

        const left = x - halfWidth;
        const right = x + halfWidth;

        const top = y - halfHeight;
        const bottom = y + halfHeight;


        // Map boundaries

        if (
            left < 0 ||
            top < 0 ||
            right > world.width ||
            bottom > world.height
        ) {
            return false;
        }


        // Water collision

        const points = [

            [left, top],

            [right, top],

            [left, bottom],

            [right, bottom],

            [x, bottom]

        ];

        for (const point of points) {

            const tx = Math.floor(
                point[0] / CONFIG.TILE_SIZE
            );

            const ty = Math.floor(
                point[1] / CONFIG.TILE_SIZE
            );

            if (tileAt(tx, ty) === "water") {
                return false;
            }

        }


        // Object collision

        for (const obstacle of world.collision) {

            const obstacleLeft = obstacle.x;
            const obstacleRight =
                obstacle.x + obstacle.width;

            const obstacleTop = obstacle.y;
            const obstacleBottom =
                obstacle.y + obstacle.height;

            if (

                right > obstacleLeft &&
                left < obstacleRight &&
                bottom > obstacleTop &&
                top < obstacleBottom

            ) {

                return false;

            }

        }

        return true;

    }


    // ======================================
    // CAMERA UPDATE
    // ======================================

    function updateCamera(deltaTime) {

        camera.targetX =
            player.x - CONFIG.VIEW_WIDTH / 2;

        camera.targetY =
            player.y - CONFIG.VIEW_HEIGHT / 2;


        camera.targetX = clamp(
            camera.targetX,
            0,
            world.width - CONFIG.VIEW_WIDTH
        );

        camera.targetY = clamp(
            camera.targetY,
            0,
            world.height - CONFIG.VIEW_HEIGHT
        );


        const smoothing =
            1 - Math.pow(
                1 - CONFIG.CAMERA_SMOOTHING,
                deltaTime * 60
            );

        camera.x +=
            (camera.targetX - camera.x) * smoothing;

        camera.y +=
            (camera.targetY - camera.y) * smoothing;

    }


    // ======================================
    // DRAW MAP
    // ======================================

    function drawMap() {

        const startX = Math.floor(
            camera.x / CONFIG.TILE_SIZE
        );

        const startY = Math.floor(
            camera.y / CONFIG.TILE_SIZE
        );

        const endX = Math.ceil(
            (camera.x + CONFIG.VIEW_WIDTH) /
            CONFIG.TILE_SIZE
        );

        const endY = Math.ceil(
            (camera.y + CONFIG.VIEW_HEIGHT) /
            CONFIG.TILE_SIZE
        );


        for (
            let y = startY;
            y <= endY;
            y++
        ) {

            for (
                let x = startX;
                x <= endX;
                x++
            ) {

                if (!inBounds(x, y)) {
                    continue;
                }

                const screenX =
                    x * CONFIG.TILE_SIZE - camera.x;

                const screenY =
                    y * CONFIG.TILE_SIZE - camera.y;

                drawTile(
                    tileAt(x, y),
                    screenX,
                    screenY
                );

            }

        }

    }


    // ======================================
    // DEPTH SORTING
    // ======================================

    function getDepth(object) {

        if (object.kind === "player") {

            return object.y + 10;

        }

        return object.y + object.height;

    }


    function drawDepthObjects() {

        const visible = [];


        for (const object of world.objects) {

            const screenX =
                object.x - camera.x;

            const screenY =
                object.y - camera.y;

            if (

                screenX + object.width < -32 ||
                screenY + object.height < -32 ||
                screenX > CONFIG.VIEW_WIDTH + 32 ||
                screenY > CONFIG.VIEW_HEIGHT + 32

            ) {
                continue;
            }

            if (object.type === "grass_detail") {

                drawObject(object);

                continue;

            }

            visible.push({

                ...object,

                kind: "object"

            });

        }


        visible.push({

            ...player,

            kind: "player"

        });


        remotePlayers.forEach(remote => {

            if (
                remote.map &&
                remote.map !== getCurrentMap()
            ) {
                return;
            }

            visible.push({

                ...remote,

                kind: "remote"

            });

        });


        visible.sort((a, b) => {

            return getDepth(a) - getDepth(b);

        });


        for (const object of visible) {

            if (object.kind === "object") {

                drawObject({

                    ...object,

                    x: object.x - camera.x,
                    y: object.y - camera.y

                });

            } else if (object.kind === "player") {

                drawCharacter(

                    object,
                    false

                );

            } else {

                drawCharacter(

                    object,
                    true

                );

            }

        }

    }


    // ======================================
    // CHARACTER RENDERER
    // ======================================

    function drawCharacter(character, remote) {

        const x =
            Math.floor(character.x - camera.x);

        const y =
            Math.floor(character.y - camera.y);


        const direction =
            character.direction || "down";

        const moving =
            character.moving === true;

        const walkFrame =
            moving
                ? Math.floor(performance.now() / 150) % 2
                : 0;

        const legOffset =
            walkFrame === 1 ? 1 : 0;


        // Shadow

        rect(
            x - 7,
            y + 9,
            14,
            4,
            "rgba(0,0,0,0.3)"
        );


        // Legs

        const legColor = "#59412e";

        rect(
            x - 5,
            y + 3 + legOffset,
            4,
            8,
            legColor
        );

        rect(
            x + 1,
            y + 3 - legOffset,
            4,
            8,
            legColor
        );


        // Body

        rect(
            x - 6,
            y - 7,
            12,
            12,
            "#74523a"
        );

        rect(
            x - 5,
            y - 6,
            10,
            10,
            "#9b704a"
        );


        // Blue scarf

        rect(
            x - 6,
            y - 6,
            12,
            3,
            "#315f91"
        );

        rect(
            x + 3,
            y - 4,
            3,
            7,
            "#477eb2"
        );


        // Head

        rect(
            x - 5,
            y - 16,
            10,
            10,
            "#d6a879"
        );


        // Hair

        rect(
            x - 6,
            y - 18,
            12,
            5,
            "#70462e"
        );

        rect(
            x - 6,
            y - 14,
            3,
            4,
            "#70462e"
        );

        rect(
            x + 3,
            y - 14,
            3,
            4,
            "#70462e"
        );


        // Face

        if (direction === "down") {

            rect(
                x - 3,
                y - 10,
                2,
                2,
                "#382c27"
            );

            rect(
                x + 2,
                y - 10,
                2,
                2,
                "#382c27"
            );

        } else if (direction === "left") {

            rect(
                x - 5,
                y - 10,
                2,
                2,
                "#382c27"
            );

        } else if (direction === "right") {

            rect(
                x + 3,
                y - 10,
                2,
                2,
                "#382c27"
            );

        }


        // Player name

        if (character.name) {

            ctx.font = "6px monospace";

            ctx.textAlign = "center";

            ctx.fillStyle = "#000000";

            ctx.fillText(
                character.name,
                x + 1,
                y - 22
            );

            ctx.fillStyle =
                remote ? "#b7d9ff" : "#ffe5ae";

            ctx.fillText(
                character.name,
                x,
                y - 23
            );

        }

    }


    // ======================================
    // RENDER
    // ======================================

    function render(time) {

        if (!running) return;

        const deltaTime =
            Math.min(
                (time - lastFrame) / 1000,
                0.05
            );

        lastFrame = time;


        updateCamera(deltaTime);


        ctx.imageSmoothingEnabled = false;


        // Background

        rect(
            0,
            0,
            CONFIG.VIEW_WIDTH,
            CONFIG.VIEW_HEIGHT,
            CONFIG.BACKGROUND
        );


        // Map

        drawMap();


        // Objects + Characters

        drawDepthObjects();


        animationFrame =
            requestAnimationFrame(render);

    }


    // ======================================
    // INITIALIZE
    // ======================================

    function init() {

        if (initialized) return true;


        canvas =
            document.getElementById("game-canvas") ||
            document.querySelector("canvas");


        if (!canvas) {

            console.error(
                "[WORLD] Game canvas not found"
            );

            return false;

        }


        ctx = canvas.getContext("2d", {

            alpha: false,

            desynchronized: true

        });


        if (!ctx) {

            console.error(
                "[WORLD] Canvas context unavailable"
            );

            return false;

        }


        canvas.width = CONFIG.VIEW_WIDTH;

        canvas.height = CONFIG.VIEW_HEIGHT;

        canvas.style.imageRendering = "pixelated";

        canvas.style.imageRendering = "crisp-edges";


        ctx.imageSmoothingEnabled = false;


        generateWorld();


        initialized = true;


        console.log(
            "[WORLD] Renderer initialized:",
            CONFIG.VERSION
        );


        return true;

    }


    // ======================================
    // START
    // ======================================

    function start() {

        if (!initialized && !init()) {
            return false;
        }

        if (running) return true;


        running = true;

        lastFrame = performance.now();

        animationFrame =
            requestAnimationFrame(render);


        console.log("[WORLD] Started");

        return true;

    }


    // ======================================
    // STOP
    // ======================================

    function stop() {

        running = false;

        if (animationFrame !== null) {

            cancelAnimationFrame(animationFrame);

            animationFrame = null;

        }

        console.log("[WORLD] Stopped");

    }


    // ======================================
    // UPDATE PLAYER
    // ======================================

    function updatePlayer(data) {

        if (!data) return;

        if (data.id !== undefined) {
            player.id = data.id;
        }

        if (Number.isFinite(data.x)) {
            player.x = data.x;
        }

        if (Number.isFinite(data.y)) {
            player.y = data.y;
        }

        if (data.name !== undefined) {
            player.name = data.name;
        }

        if (data.direction) {
            player.direction = data.direction;
        }

        if (typeof data.moving === "boolean") {
            player.moving = data.moving;
        }

    }


    // ======================================
    // UPDATE REMOTE PLAYER
    // ======================================

    function updateRemotePlayer(data) {

        if (!data?.id) return;

        if (data.id === player.id) return;


        const previous =
            remotePlayers.get(data.id) || {};


        remotePlayers.set(data.id, {

            ...previous,

            ...data,

            x: Number.isFinite(data.x)
                ? data.x
                : previous.x || 0,

            y: Number.isFinite(data.y)
                ? data.y
                : previous.y || 0,

            direction:
                data.direction ||
                previous.direction ||
                "down"

        });

    }


    // ======================================
    // REMOVE REMOTE PLAYER
    // ======================================

    function removeRemotePlayer(id) {

        remotePlayers.delete(id);

    }


    // ======================================
    // MAP ID
    // ======================================

    function getCurrentMap() {

        return (
            window.ECHO_GAME?.world?.currentMap ||
            "starting_village"
        );

    }


    // ======================================
    // PUBLIC API
    // ======================================

    return {

        init,

        start,

        stop,

        updatePlayer,

        updateRemotePlayer,

        removeRemotePlayer,

        canMoveTo,

        get player() {
            return { ...player };
        },

        get running() {
            return running;
        },

        get mapLoaded() {
            return world.generated;
        },

        get camera() {
            return { ...camera };
        },

        get world() {
            return {

                width: world.width,

                height: world.height,

                objects: world.objects.length

            };
        },

        get remotePlayers() {
            return remotePlayers;
        },

        CONFIG

    };

})();
