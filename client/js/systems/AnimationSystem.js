/* =========================================
   ECHO ISLES RPG
   Animation System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const animations = new Map();
    const spriteSheets = new Map();

    const DEFAULT_ANIMATIONS = {
        idle: {
            frames: [0, 1, 2, 3],
            frameDuration: 250,
            loop: true
        },

        walk: {
            frames: [0, 1, 2, 3, 4, 5],
            frameDuration: 120,
            loop: true
        },

        run: {
            frames: [0, 1, 2, 3, 4, 5],
            frameDuration: 80,
            loop: true
        },

        attack: {
            frames: [0, 1, 2, 3, 4],
            frameDuration: 100,
            loop: false
        },

        skill: {
            frames: [0, 1, 2, 3, 4, 5],
            frameDuration: 100,
            loop: false
        },

        dodge: {
            frames: [0, 1, 2, 3],
            frameDuration: 70,
            loop: false
        },

        death: {
            frames: [0, 1, 2, 3, 4, 5],
            frameDuration: 150,
            loop: false
        }
    };

    function createState(entityId) {
        return {
            entityId,
            currentAnimation: "idle",
            currentFrame: 0,
            elapsed: 0,
            finished: false,
            facing: "down",
            speed: 1,
            animations: structuredClone(DEFAULT_ANIMATIONS)
        };
    }

    function getState(entityId) {
        if (!animations.has(entityId)) {
            animations.set(entityId, createState(entityId));
        }

        return animations.get(entityId);
    }

    // =====================================
    // SPRITE SHEET
    // =====================================

    function loadSpriteSheet(name, url, settings = {}) {
        return new Promise((resolve, reject) => {

            if (spriteSheets.has(name)) {
                resolve(spriteSheets.get(name));
                return;
            }

            const image = new Image();

            image.onload = function () {

                const sheet = {
                    name,
                    image,
                    frameWidth: settings.frameWidth || 64,
                    frameHeight: settings.frameHeight || 64,
                    columns: settings.columns || Math.floor(
                        image.width / (settings.frameWidth || 64)
                    ),
                    rows: settings.rows || Math.floor(
                        image.height / (settings.frameHeight || 64)
                    ),
                    loaded: true
                };

                spriteSheets.set(name, sheet);

                resolve(sheet);
            };

            image.onerror = function () {
                reject(new Error(
                    "Cannot load sprite sheet: " + url
                ));
            };

            image.src = url;
        });
    }

    function getSpriteSheet(name) {
        return spriteSheets.get(name) || null;
    }

    // =====================================
    // ANIMATION REGISTRATION
    // =====================================

    function registerAnimation(entityId, name, config) {

        const state = getState(entityId);

        if (!config || !Array.isArray(config.frames)) {
            console.error("Invalid animation configuration:", name);
            return false;
        }

        state.animations[name] = {
            frames: config.frames,
            frameDuration: config.frameDuration || 100,
            loop: config.loop !== false,
            row: config.row || 0
        };

        return true;
    }

    // =====================================
    // PLAY ANIMATION
    // =====================================

    function play(entityId, animationName, options = {}) {

        const state = getState(entityId);

        if (!state.animations[animationName]) {
            console.warn("Animation not found:", animationName);
            return false;
        }

        if (
            state.currentAnimation === animationName &&
            !options.force
        ) {
            return true;
        }

        state.currentAnimation = animationName;
        state.currentFrame = 0;
        state.elapsed = 0;
        state.finished = false;

        if (options.speed !== undefined) {
            state.speed = Math.max(0.1, options.speed);
        } else {
            state.speed = 1;
        }

        if (options.facing) {
            state.facing = options.facing;
        }

        return true;
    }

    // =====================================
    // UPDATE ANIMATION
    // =====================================

    function update(deltaTime) {

        const delta = Math.max(0, deltaTime);

        for (const state of animations.values()) {

            if (state.finished) continue;

            const animation =
                state.animations[state.currentAnimation];

            if (!animation || animation.frames.length === 0) {
                continue;
            }

            state.elapsed += delta * 1000 * state.speed;

            while (
                state.elapsed >= animation.frameDuration &&
                !state.finished
            ) {

                state.elapsed -= animation.frameDuration;

                state.currentFrame++;

                if (state.currentFrame >= animation.frames.length) {

                    if (animation.loop) {
                        state.currentFrame = 0;
                    } else {
                        state.currentFrame =
                            animation.frames.length - 1;

                        state.finished = true;
                    }
                }
            }
        }
    }

    // =====================================
    // DRAW ANIMATION
    // =====================================

    function draw(ctx, entityId, sheetName, x, y, options = {}) {

        const state = getState(entityId);
        const sheet = getSpriteSheet(sheetName);

        if (!sheet || !sheet.loaded) {
            return false;
        }

        const animation =
            state.animations[state.currentAnimation];

        if (!animation) {
            return false;
        }

        const frameIndex =
            animation.frames[state.currentFrame];

        const column = frameIndex % sheet.columns;

        const row = animation.row || 0;

        const sourceX = column * sheet.frameWidth;
        const sourceY = row * sheet.frameHeight;

        const width = options.width || sheet.frameWidth;
        const height = options.height || sheet.frameHeight;

        const offsetX = options.offsetX || 0;
        const offsetY = options.offsetY || 0;

        ctx.save();

        if (options.flipX) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);

            ctx.drawImage(
                sheet.image,
                sourceX,
                sourceY,
                sheet.frameWidth,
                sheet.frameHeight,
                offsetX,
                offsetY,
                width,
                height
            );
        } else {

            ctx.drawImage(
                sheet.image,
                sourceX,
                sourceY,
                sheet.frameWidth,
                sheet.frameHeight,
                x + offsetX,
                y + offsetY,
                width,
                height
            );
        }

        ctx.restore();

        return true;
    }

    // =====================================
    // ANIMATION CONTROL
    // =====================================

    function setFacing(entityId, direction) {

        const validDirections = [
            "up",
            "down",
            "left",
            "right"
        ];

        if (!validDirections.includes(direction)) {
            return false;
        }

        getState(entityId).facing = direction;

        return true;
    }

    function getCurrentAnimation(entityId) {
        return getState(entityId).currentAnimation;
    }

    function getCurrentFrame(entityId) {
        return getState(entityId).currentFrame;
    }

    function isFinished(entityId) {
        return getState(entityId).finished;
    }

    function reset(entityId) {

        const state = getState(entityId);

        state.currentFrame = 0;
        state.elapsed = 0;
        state.finished = false;
    }

    function remove(entityId) {
        animations.delete(entityId);
    }

    function removeSpriteSheet(name) {
        spriteSheets.delete(name);
    }

    function getAvailableAnimations(entityId) {
        return Object.keys(getState(entityId).animations);
    }

    // =====================================
    // PUBLIC API
    // =====================================

    window.AnimationSystem = {

        loadSpriteSheet,
        getSpriteSheet,

        registerAnimation,

        play,
        update,
        draw,

        setFacing,

        getCurrentAnimation,
        getCurrentFrame,
        getAvailableAnimations,

        isFinished,
        reset,

        remove,
        removeSpriteSheet
    };

    console.log("AnimationSystem initialized");

})();
