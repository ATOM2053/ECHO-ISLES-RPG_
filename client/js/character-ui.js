/* =========================================
   ECHO ISLES RPG
   CHARACTER CREATOR UI
   Version: 1.4.0
========================================= */

"use strict";

window.ECHO_CHARACTER_UI = (() => {

    let selectedCharacter = null;
    let enteringWorld = false;
    let loadingCharacters = false;

    const $ = id => document.getElementById(id);

    const JOBS = [
        "Adventurer",
        "Swordsman",
        "Knight",
        "Archer",
        "Mage",
        "Assassin",
        "Priest"
    ];

    const RACES = [
        "Human",
        "Elf",
        "Dark Elf",
        "Dwarf",
        "Beastkin",
        "Dragonkin"
    ];

    /* =====================================
       UTILITIES
    ===================================== */

    function showMessage(message) {

        const element = $("character-message");

        if (element) {
            element.textContent = message;
        }

    }

    function createElement(tag, className, text) {

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;

    }

    function getRaceClass(race) {

        return String(race || "human")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");

    }

    function getInitial(name) {

        return String(name || "?")
            .trim()
            .charAt(0)
            .toUpperCase();

    }

    /* =====================================
       ENTER BUTTON
    ===================================== */

    function createEnterButton() {

        let button = $("character-enter-world");

        if (button) return button;

        button = createElement(
            "button",
            "character-action character-enter-button",
            "ENTER WORLD"
        );

        button.id = "character-enter-world";
        button.type = "button";
        button.disabled = true;

        button.addEventListener("click", enterWorld);

        const list = $("character-list");

        if (list) {
            list.insertAdjacentElement("afterend", button);
        }

        return button;

    }

    function updateEnterButton() {

        const button = createEnterButton();

        if (!button) return;

        button.disabled = !selectedCharacter || enteringWorld;

        button.textContent = enteringWorld
            ? "CONNECTING..."
            : "ENTER WORLD";

    }

    /* =====================================
       CHARACTER CARD
    ===================================== */

    function createCard(character) {

        const card = createElement(
            "article",
            "character-card"
        );

        card.dataset.characterId = character.id;

        /* AVATAR */

        const avatar = createElement(
            "div",
            "character-avatar " + getRaceClass(character.race)
        );

        const initial = createElement(
            "span",
            "character-avatar-initial",
            getInitial(character.name)
        );

        avatar.appendChild(initial);

        /* INFORMATION */

        const info = createElement(
            "div",
            "character-info"
        );

        const name = createElement(
            "h3",
            "character-name",
            character.name
        );

        const level = createElement(
            "p",
            "character-level",
            "LEVEL " + (character.level || 1)
        );

        const race = createElement(
            "p",
            "character-race",
            character.race
        );

        const job = createElement(
            "p",
            "character-job",
            character.job || "Adventurer"
        );

        const gender = createElement(
            "p",
            "character-gender",
            character.gender
        );

        info.append(
            name,
            level,
            race,
            job,
            gender
        );

        /* SELECT BUTTON */

        const select = createElement(
            "button",
            "character-action character-select-button",
            "SELECT CHARACTER"
        );

        select.type = "button";

        select.addEventListener("click", () => {

            selectCharacter(character, card);

        });

        card.append(
            avatar,
            info,
            select
        );

        return card;

    }

    /* =====================================
       SELECT CHARACTER
    ===================================== */

    function selectCharacter(character, card) {

        selectedCharacter = character;

        document.querySelectorAll(".character-card")
            .forEach(item => {

                item.classList.remove("selected");

            });

        if (card) {
            card.classList.add("selected");
        }

        updateEnterButton();

        showMessage(
            "Selected character: " + character.name
        );

    }

    /* =====================================
       LOAD CHARACTERS
    ===================================== */

    async function loadCharacters() {

        const list = $("character-list");

        if (!list || loadingCharacters) return;

        loadingCharacters = true;

        list.replaceChildren();

        selectedCharacter = null;

        updateEnterButton();

        showMessage("Loading characters...");

        try {

            if (!window.ECHO_CHARACTERS) {
                throw new Error(
                    "Character service is unavailable."
                );
            }

            const characters =
                await window.ECHO_CHARACTERS.getAll();

            if (!Array.isArray(characters)) {
                throw new Error(
                    "Invalid character response."
                );
            }

            if (characters.length === 0) {

                const empty = createElement(
                    "div",
                    "character-empty"
                );

                const title = createElement(
                    "h3",
                    "",
                    "YOUR JOURNEY BEGINS HERE"
                );

                const description = createElement(
                    "p",
                    "",
                    "You don't have any characters yet."
                );

                empty.append(
                    title,
                    description
                );

                list.appendChild(empty);

                showMessage("");

                return;

            }

            characters.forEach(character => {

                list.appendChild(
                    createCard(character)
                );

            });

            showMessage(
                "Characters loaded: " + characters.length
            );

        } catch (error) {

            showMessage(
                error.message || "Unable to load characters."
            );

        } finally {

            loadingCharacters = false;

        }

    }

    /* =====================================
       CREATE CHARACTER
    ===================================== */

    async function createCharacter(event) {

        event.preventDefault();

        if (loadingCharacters || enteringWorld) return;

        const nameElement = $("character-name");
        const raceElement = $("character-race");
        const genderElement = $("character-gender");
        const jobElement = $("character-job");

        if (
            !nameElement ||
            !raceElement ||
            !genderElement
        ) {
            showMessage("Character form is incomplete.");
            return;
        }

        const name = nameElement.value.trim();
        const race = raceElement.value;
        const gender = genderElement.value;

        const job = jobElement
            ? jobElement.value
            : "Adventurer";

        if (!name || !race || !gender || !job) {

            showMessage(
                "Please complete all character fields."
            );

            return;

        }

        if (!RACES.includes(race)) {

            showMessage("Invalid character race.");

            return;

        }

        if (!JOBS.includes(job)) {

            showMessage("Invalid character class.");

            return;

        }

        const button = $("character-create-submit");

        if (!button) return;

        button.disabled = true;

        showMessage("Creating character...");

        try {

            await window.ECHO_CHARACTERS.create({
                name,
                race,
                gender,
                job
            });

            nameElement.value = "";

            if (jobElement) {
                jobElement.value = "Adventurer";
            }

            showMessage(
                "Character created successfully!"
            );

            await loadCharacters();

        } catch (error) {

            showMessage(
                error.message || "Unable to create character."
            );

        } finally {

            button.disabled = false;

        }

    }

    /* =====================================
       ENTER WORLD
    ===================================== */

    async function enterWorld() {

        if (enteringWorld) return;

        if (!selectedCharacter) {

            showMessage(
                "Please select a character first."
            );

            return;

        }

        if (!window.ECHO_GAME) {

            showMessage(
                "Game controller is unavailable."
            );

            return;

        }

        enteringWorld = true;

        updateEnterButton();

        showMessage(
            "Connecting to game server..."
        );

        try {

            const result =
                await window.ECHO_GAME.enterWorld(
                    selectedCharacter.id
                );

            if (!result || !result.success) {

                throw new Error(
                    "Server did not confirm world entry."
                );

            }

            const panel = $("character-panel");

            if (panel) {
                panel.hidden = true;
            }

            document.dispatchEvent(
                new CustomEvent("echo:world-entered", {
                    detail: {
                        character: selectedCharacter,
                        player: window.ECHO_GAME.player
                    }
                })
            );

            showMessage("Entering game world...");

        } catch (error) {

            showMessage(
                "Unable to enter world: " +
                (error.message || "Unknown error")
            );

        } finally {

            enteringWorld = false;

            updateEnterButton();

        }

    }

    /* =====================================
       OPEN / CLOSE
    ===================================== */

    function open() {

        const mainMenu = $("main-menu");
        const accountPanel = $("account-panel");
        const characterPanel = $("character-panel");

        if (mainMenu) {
            mainMenu.hidden = true;
        }

        if (accountPanel) {
            accountPanel.hidden = true;
        }

        if (characterPanel) {
            characterPanel.hidden = false;
        }

        loadCharacters();

    }

    function close() {

        const characterPanel = $("character-panel");
        const mainMenu = $("main-menu");

        if (characterPanel) {
            characterPanel.hidden = true;
        }

        if (mainMenu) {
            mainMenu.hidden = false;
        }

        selectedCharacter = null;

        updateEnterButton();

    }

    /* =====================================
       INITIALIZE
    ===================================== */

    function init() {

        const form = $("character-form");

        if (form) {

            form.addEventListener(
                "submit",
                createCharacter
            );

        }

        const back = $("character-back");

        if (back) {

            back.addEventListener(
                "click",
                close
            );

        }

        createEnterButton();

    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    /* =====================================
       PUBLIC API
    ===================================== */

    return {

        open,
        close,
        loadCharacters,
        enterWorld,

        get selectedCharacter() {
            return selectedCharacter;
        },

        jobs: JOBS,
        races: RACES

    };

})();
