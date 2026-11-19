/* =========================================
   ECHO ISLES RPG
   CHARACTER CREATOR UI
   Version: 1.5.0
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
       RACE INFORMATION
    ===================================== */

    const RACE_INFO = {

        "Human": {
            title: "Human",
            description:
                "A versatile race with balanced abilities. Humans are adaptable and can pursue many different paths.",
            attribute: "Balanced"
        },

        "Elf": {
            title: "Elf",
            description:
                "An ancient race connected to nature. Elves are known for their agility and wisdom.",
            attribute: "Nature"
        },

        "Dark Elf": {
            title: "Dark Elf",
            description:
                "A mysterious race with a strong connection to shadow and forbidden magic.",
            attribute: "Shadow"
        },

        "Dwarf": {
            title: "Dwarf",
            description:
                "A resilient race known for craftsmanship, determination and endurance.",
            attribute: "Endurance"
        },

        "Beastkin": {
            title: "Beastkin",
            description:
                "A race with animal ancestry. Beastkin are naturally connected to wilderness and instinct.",
            attribute: "Instinct"
        },

        "Dragonkin": {
            title: "Dragonkin",
            description:
                "A rare race carrying ancient dragon heritage and a mysterious inner power.",
            attribute: "Dragon Heritage"
        }

    };

    /* =====================================
       CLASS INFORMATION
    ===================================== */

    const JOB_INFO = {

        "Adventurer": {
            title: "Adventurer",
            description:
                "A beginner journeying into the unknown world. A flexible path for new explorers.",
            role: "Explorer"
        },

        "Swordsman": {
            title: "Swordsman",
            description:
                "A warrior who specializes in sword combat and balanced offensive techniques.",
            role: "Melee Fighter"
        },

        "Knight": {
            title: "Knight",
            description:
                "A heavily armored defender who protects allies and withstands enemy attacks.",
            role: "Defender"
        },

        "Archer": {
            title: "Archer",
            description:
                "A ranged fighter who uses bows and precision to attack enemies from a distance.",
            role: "Ranged Fighter"
        },

        "Mage": {
            title: "Mage",
            description:
                "A spellcaster who studies ancient magic and channels powerful magical energy.",
            role: "Magic"
        },

        "Assassin": {
            title: "Assassin",
            description:
                "A swift combat specialist who relies on agility and precise attacks.",
            role: "Agility"
        },

        "Priest": {
            title: "Priest",
            description:
                "A sacred spellcaster who supports allies through healing and protective magic.",
            role: "Support"
        }

    };

    /* =====================================
       UTILITIES
    ===================================== */

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

    function showMessage(message) {

        const element = $("character-message");

        if (element) {
            element.textContent = message;
        }

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
       CHARACTER PREVIEW
    ===================================== */

    function createPreview() {

        let preview = $("character-preview");

        if (preview) return preview;

        const form = $("character-form");

        if (!form) return null;

        preview = createElement(
            "section",
            "character-preview"
        );

        preview.id = "character-preview";

        const heading = createElement(
            "h3",
            "preview-heading",
            "CHARACTER PREVIEW"
        );

        const content = createElement(
            "div",
            "preview-content"
        );

        const avatar = createElement(
            "div",
            "preview-avatar human"
        );

        avatar.id = "preview-avatar";

        const initial = createElement(
            "span",
            "preview-avatar-initial",
            "A"
        );

        initial.id = "preview-initial";

        avatar.appendChild(initial);

        const details = createElement(
            "div",
            "preview-details"
        );

        const name = createElement(
            "h4",
            "preview-name",
            "Your Character"
        );

        name.id = "preview-name";

        const race = createElement(
            "p",
            "preview-race",
            "Race: Human"
        );

        race.id = "preview-race";

        const gender = createElement(
            "p",
            "preview-gender",
            "Gender: Male"
        );

        gender.id = "preview-gender";

        const job = createElement(
            "p",
            "preview-job",
            "Class: Adventurer"
        );

        job.id = "preview-job";

        details.append(
            name,
            race,
            gender,
            job
        );

        content.append(
            avatar,
            details
        );

        const information = createElement(
            "div",
            "preview-information"
        );

        const raceTitle = createElement(
            "h4",
            "",
            "RACE INFORMATION"
        );

        raceTitle.id = "preview-race-title";

        const raceDescription = createElement(
            "p",
            "",
            RACE_INFO.Human.description
        );

        raceDescription.id = "preview-race-description";

        const raceAttribute = createElement(
            "span",
            "preview-attribute",
            "Attribute: Balanced"
        );

        raceAttribute.id = "preview-race-attribute";

        const jobTitle = createElement(
            "h4",
            "",
            "CLASS INFORMATION"
        );

        jobTitle.id = "preview-job-title";

        const jobDescription = createElement(
            "p",
            "",
            JOB_INFO.Adventurer.description
        );

        jobDescription.id = "preview-job-description";

        const jobRole = createElement(
            "span",
            "preview-attribute",
            "Role: Explorer"
        );

        jobRole.id = "preview-job-role";

        information.append(
            raceTitle,
            raceDescription,
            raceAttribute,
            jobTitle,
            jobDescription,
            jobRole
        );

        preview.append(
            heading,
            content,
            information
        );

        form.insertAdjacentElement(
            "beforebegin",
            preview
        );

        return preview;

    }

    /* =====================================
       UPDATE PREVIEW
    ===================================== */

    function updatePreview() {

        const nameElement = $("character-name");
        const raceElement = $("character-race");
        const genderElement = $("character-gender");
        const jobElement = $("character-job");

        if (!raceElement || !genderElement) return;

        const name = nameElement
            ? nameElement.value.trim()
            : "";

        const race = raceElement.value || "Human";

        const gender = genderElement.value || "Male";

        const job = jobElement
            ? jobElement.value || "Adventurer"
            : "Adventurer";

        const raceData =
            RACE_INFO[race] || RACE_INFO.Human;

        const jobData =
            JOB_INFO[job] || JOB_INFO.Adventurer;

        const avatar = $("preview-avatar");

        if (avatar) {

            avatar.className =
                "preview-avatar " + getRaceClass(race);

        }

        const initial = $("preview-initial");

        if (initial) {
            initial.textContent = getInitial(name || "A");
        }

        const previewName = $("preview-name");

        if (previewName) {
            previewName.textContent = name || "Your Character";
        }

        const previewRace = $("preview-race");

        if (previewRace) {
            previewRace.textContent = "Race: " + race;
        }

        const previewGender = $("preview-gender");

        if (previewGender) {
            previewGender.textContent = "Gender: " + gender;
        }

        const previewJob = $("preview-job");

        if (previewJob) {
            previewJob.textContent = "Class: " + job;
        }

        const raceTitle = $("preview-race-title");

        if (raceTitle) {
            raceTitle.textContent = raceData.title;
        }

        const raceDescription = $("preview-race-description");

        if (raceDescription) {
            raceDescription.textContent =
                raceData.description;
        }

        const raceAttribute = $("preview-race-attribute");

        if (raceAttribute) {
            raceAttribute.textContent =
                "Attribute: " + raceData.attribute;
        }

        const jobTitle = $("preview-job-title");

        if (jobTitle) {
            jobTitle.textContent = jobData.title;
        }

        const jobDescription = $("preview-job-description");

        if (jobDescription) {
            jobDescription.textContent =
                jobData.description;
        }

        const jobRole = $("preview-job-role");

        if (jobRole) {
            jobRole.textContent =
                "Role: " + jobData.role;
        }

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

        const avatar = createElement(
            "div",
            "character-avatar " +
            getRaceClass(character.race)
        );

        const initial = createElement(
            "span",
            "character-avatar-initial",
            getInitial(character.name)
        );

        avatar.appendChild(initial);

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

        button.disabled =
            !selectedCharacter || enteringWorld;

        button.textContent = enteringWorld
            ? "CONNECTING..."
            : "ENTER WORLD";

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

            showMessage(
                "Character form is incomplete."
            );

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

            updatePreview();

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

        updatePreview();

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

        createPreview();

        const previewInputs = [
            "character-name",
            "character-race",
            "character-gender",
            "character-job"
        ];

        previewInputs.forEach(id => {

            const element = $(id);

            if (!element) return;

            element.addEventListener(
                "input",
                updatePreview
            );

            element.addEventListener(
                "change",
                updatePreview
            );

        });

        updatePreview();

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
        updatePreview,

        get selectedCharacter() {
            return selectedCharacter;
        },

        jobs: JOBS,
        races: RACES,
        raceInfo: RACE_INFO,
        jobInfo: JOB_INFO

    };

})();
