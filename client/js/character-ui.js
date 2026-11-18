/* =========================================
   ECHO ISLES RPG
   CHARACTER CREATOR UI
   Version: 1.0.0
========================================= */

"use strict";

window.ECHO_CHARACTER_UI = (() => {

    let selectedCharacter = null;

    const $ = id => document.getElementById(id);

    function showMessage(message) {

        const element = $("character-message");

        if (element) {
            element.textContent = message;
        }

    }

    function createCard(character) {

        const card = document.createElement("div");

        card.className = "character-card";

        const name = document.createElement("h3");
        name.textContent = character.name;

        const race = document.createElement("p");
        race.textContent = "Race: " + character.race;

        const level = document.createElement("p");
        level.textContent = "Level: " + character.level;

        const job = document.createElement("p");
        job.textContent = "Class: " + (character.job || "Adventurer");

        const select = document.createElement("button");

        select.className = "character-action";
        select.textContent = "SELECT";

        select.addEventListener("click", () => {

            selectedCharacter = character;

            document.querySelectorAll(".character-card")
                .forEach(item => item.classList.remove("selected"));

            card.classList.add("selected");

            showMessage(
                "Selected character: " + character.name
            );

        });

        card.append(name, race, level, job, select);

        return card;

    }

    async function loadCharacters() {

        const list = $("character-list");

        if (!list) return;

        list.replaceChildren();

        showMessage("Loading characters...");

        try {

            const characters =
                await window.ECHO_CHARACTERS.getAll();

            if (!characters.length) {

                const empty = document.createElement("div");

                empty.className = "character-empty";
                empty.textContent = "No characters found. Create your first character!";

                list.appendChild(empty);

                showMessage("");

                return;

            }

            characters.forEach(character => {

                list.appendChild(createCard(character));

            });

            showMessage(
                "Characters loaded: " + characters.length
            );

        } catch (error) {

            showMessage(error.message);

        }

    }

    async function createCharacter(event) {

        event.preventDefault();

        const name = $("character-name").value.trim();
        const race = $("character-race").value;
        const gender = $("character-gender").value;

        if (!name || !race || !gender) {

            showMessage("Please complete all fields.");

            return;

        }

        const button = $("character-create-submit");

        button.disabled = true;

        try {

            await window.ECHO_CHARACTERS.create({
                name,
                race,
                gender
            });

            $("character-name").value = "";

            showMessage("Character created successfully!");

            await loadCharacters();

        } catch (error) {

            showMessage(error.message);

        } finally {

            button.disabled = false;

        }

    }

    function open() {

        $("main-menu").hidden = true;
        $("account-panel").hidden = true;

        $("character-panel").hidden = false;

        loadCharacters();

    }

    function close() {

        $("character-panel").hidden = true;
        $("main-menu").hidden = false;

    }

    function init() {

        const form = $("character-form");

        if (form) {
            form.addEventListener("submit", createCharacter);
        }

        const back = $("character-back");

        if (back) {
            back.addEventListener("click", close);
        }

    }

    document.addEventListener("DOMContentLoaded", init);

    return {
        open,
        close,
        loadCharacters,

        get selectedCharacter() {
            return selectedCharacter;
        }

    };

})();
