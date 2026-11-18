(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let currentMap = "starting_village";
    let currentWeather = "clear";
    let currentTime = 12;

    let maps = new Map();
    let warpPoints = new Map();

    const callbacks = {
        onMapChanged: null,
        onWeatherChanged: null,
        onTimeChanged: null,
        onWarpPointsUpdated: null,
        onWorldUpdated: null,
        onError: null
    };

    const MAP_DATABASE = {
        starting_village: {
            id: "starting_village",
            name: "Starting Village",
            displayName: "หมู่บ้านเริ่มต้น",
            region: "Moonlight Kingdom",
            minLevel: 1,
            type: "village",
            safeZone: true,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 2000,
            height: 2000
        },

        moonlight_kingdom: {
            id: "moonlight_kingdom",
            name: "Moonlight Kingdom",
            displayName: "อาณาจักรแสงจันทร์",
            region: "Moonlight Kingdom",
            minLevel: 10,
            type: "kingdom",
            safeZone: true,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 4000,
            height: 4000
        },

        emerald_forest: {
            id: "emerald_forest",
            name: "Emerald Forest",
            displayName: "ป่ามรกต",
            region: "Emerald Region",
            minLevel: 5,
            type: "forest",
            safeZone: false,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 3000,
            height: 3000
        },

        amber_desert: {
            id: "amber_desert",
            name: "Amber Desert",
            displayName: "ทะเลทรายอำพัน",
            region: "Amber Region",
            minLevel: 20,
            type: "desert",
            safeZone: false,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 3500,
            height: 3500
        },

        frostfall_kingdom: {
            id: "frostfall_kingdom",
            name: "Frostfall Kingdom",
            displayName: "อาณาจักรน้ำแข็ง",
            region: "Frost Region",
            minLevel: 30,
            type: "snow",
            safeZone: true,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 4000,
            height: 4000
        },

        dragon_abyss: {
            id: "dragon_abyss",
            name: "Dragon Abyss",
            displayName: "หุบเหวมังกร",
            region: "Dragon Region",
            minLevel: 50,
            type: "dungeon",
            safeZone: false,
            pvpEnabled: true,
            weatherEnabled: false,
            width: 5000,
            height: 5000
        },

        ancient_ruins: {
            id: "ancient_ruins",
            name: "Ancient Ruins",
            displayName: "ซากปรักหักพังโบราณ",
            region: "Ancient Region",
            minLevel: 40,
            type: "ruins",
            safeZone: false,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 3000,
            height: 3000
        },

        capital_city: {
            id: "capital_city",
            name: "Capital City",
            displayName: "นครหลวง",
            region: "Moonlight Kingdom",
            minLevel: 15,
            type: "city",
            safeZone: true,
            pvpEnabled: false,
            weatherEnabled: true,
            width: 5000,
            height: 5000
        }
    };

    const WEATHER_TYPES = [
        "clear",
        "cloudy",
        "rain",
        "storm",
        "snow",
        "fog"
    ];

    const TIME_CONFIG = {
        DAY_START: 6,
        NIGHT_START: 18,
        HOURS_PER_DAY: 24
    };

    function emit(event, data = {}) {
        if (!socket || !socket.connected) {
            return false;
        }

        socket.emit(event, data);
        return true;
    }

    function notify(name, data) {
        if (typeof callbacks[name] === "function") {
            callbacks[name](data);
        }
    }

    // =====================================
    // MAP MANAGEMENT
    // =====================================

    function registerMap(mapData) {
        if (!mapData || !mapData.id) {
            return false;
        }

        maps.set(String(mapData.id), {
            ...mapData
        });

        return true;
    }

    function getMap(mapId) {
        const map = maps.get(String(mapId));

        return map ? { ...map } : null;
    }

    function getAllMaps() {
        return Array.from(maps.values()).map(map => ({
            ...map
        }));
    }

    function getCurrentMap() {
        return getMap(currentMap);
    }

    function getCurrentMapId() {
        return currentMap;
    }

    function changeMap(mapId) {
        const id = String(mapId || "");
        const map = getMap(id);

        if (!map) {
            return {
                success: false,
                message: "ไม่พบแผนที่นี้"
            };
        }

        const playerLevel =
            Number(window.ECHO_GAME?.player?.level) || 1;

        if (playerLevel < map.minLevel) {
            return {
                success: false,
                message: `ต้องมีเลเวลอย่างน้อย ${map.minLevel}`
            };
        }

        const sent = emit("world:change-map", {
            mapId: id
        });

        if (!sent) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        return {
            success: true,
            message: "ส่งคำขอเปลี่ยนแผนที่แล้ว"
        };
    }

    function applyMapChange(data) {
        if (!data || !maps.has(String(data.mapId))) {
            return false;
        }

        const previousMap = currentMap;

        currentMap = String(data.mapId);

        notify("onMapChanged", {
            previousMap,
            currentMap,
            map: getCurrentMap(),
            position: data.position || null
        });

        return true;
    }

    // =====================================
    // WARP SYSTEM
    // =====================================

    function registerWarpPoint(point) {
        if (
            !point ||
            !point.id ||
            !point.mapId ||
            !Number.isFinite(point.x) ||
            !Number.isFinite(point.y)
        ) {
            return false;
        }

        if (!maps.has(String(point.mapId))) {
            return false;
        }

        warpPoints.set(String(point.id), {
            id: String(point.id),
            name: String(point.name || "Warp Point"),
            mapId: String(point.mapId),
            x: point.x,
            y: point.y,
            targetMap: point.targetMap || null,
            targetX: Number(point.targetX) || 0,
            targetY: Number(point.targetY) || 0,
            requiredLevel: Number(point.requiredLevel) || 1
        });

        return true;
    }

    function getWarpPoints(mapId = currentMap) {
        return Array.from(warpPoints.values())
            .filter(point => point.mapId === String(mapId))
            .map(point => ({ ...point }));
    }

    function useWarpPoint(pointId) {
        const point = warpPoints.get(String(pointId));

        if (!point) {
            return {
                success: false,
                message: "ไม่พบจุดวาร์ป"
            };
        }

        if (point.mapId !== currentMap) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในแผนที่ของจุดวาร์ปนี้"
            };
        }

        const playerLevel =
            Number(window.ECHO_GAME?.player?.level) || 1;

        if (playerLevel < point.requiredLevel) {
            return {
                success: false,
                message: "เลเวลของคุณยังไม่เพียงพอ"
            };
        }

        const sent = emit("world:use-warp", {
            warpId: point.id
        });

        return {
            success: sent,
            message: sent
                ? "กำลังส่งคำขอเดินทาง"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function setWarpPoints(points) {
        warpPoints.clear();

        if (!Array.isArray(points)) return;

        points.forEach(registerWarpPoint);

        notify("onWarpPointsUpdated", getWarpPoints());
    }

    // =====================================
    // WEATHER SYSTEM
    // =====================================

    function setWeather(weather) {
        if (!WEATHER_TYPES.includes(weather)) {
            return false;
        }

        if (weather === currentWeather) {
            return true;
        }

        const previousWeather = currentWeather;

        currentWeather = weather;

        notify("onWeatherChanged", {
            previousWeather,
            weather: currentWeather
        });

        return true;
    }

    function getWeather() {
        return currentWeather;
    }

    function getAvailableWeather() {
        return [...WEATHER_TYPES];
    }

    // =====================================
    // DAY AND NIGHT
    // =====================================

    function setWorldTime(hour) {
        if (!Number.isFinite(hour)) {
            return false;
        }

        const normalizedHour =
            ((hour % 24) + 24) % 24;

        const previousTime = currentTime;

        currentTime = normalizedHour;

        notify("onTimeChanged", {
            previousTime,
            currentTime,
            period: getTimePeriod(),
            isDay: isDaytime(),
            isNight: isNighttime()
        });

        return true;
    }

    function getWorldTime() {
        return currentTime;
    }

    function getTimePeriod() {
        if (
            currentTime >= TIME_CONFIG.DAY_START &&
            currentTime < TIME_CONFIG.NIGHT_START
        ) {
            return "day";
        }

        return "night";
    }

    function isDaytime() {
        return getTimePeriod() === "day";
    }

    function isNighttime() {
        return getTimePeriod() === "night";
    }

    // =====================================
    // ZONE INFORMATION
    // =====================================

    function isSafeZone(mapId = currentMap) {
        const map = getMap(mapId);

        return Boolean(map?.safeZone);
    }

    function isPvPEnabled(mapId = currentMap) {
        const map = getMap(mapId);

        return Boolean(map?.pvpEnabled);
    }

    function isWeatherEnabled(mapId = currentMap) {
        const map = getMap(mapId);

        return Boolean(map?.weatherEnabled);
    }

    function getPlayerPosition() {
        const player = window.ECHO_GAME?.player;

        if (!player) return null;

        return {
            x: Number(player.x) || 0,
            y: Number(player.y) || 0
        };
    }

    function isInsideMap(x, y, mapId = currentMap) {
        const map = getMap(mapId);

        if (!map || !Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
        }

        return (
            x >= 0 &&
            y >= 0 &&
            x <= map.width &&
            y <= map.height
        );
    }

    // =====================================
    // WORLD DATA
    // =====================================

    function requestWorldData() {
        return emit("world:get-data");
    }

    function getWorldInfo() {
        return {
            map: getCurrentMap(),
            weather: currentWeather,
            time: currentTime,
            period: getTimePeriod(),
            isDay: isDaytime(),
            isNight: isNighttime(),
            safeZone: isSafeZone(),
            pvpEnabled: isPvPEnabled()
        };
    }

    // =====================================
    // SOCKET EVENTS
    // =====================================

    function handleMapChanged(data) {
        applyMapChange(data);
    }

    function handleWeatherChanged(data) {
        if (data?.weather) {
            setWeather(data.weather);
        }
    }

    function handleTimeChanged(data) {
        if (Number.isFinite(data?.hour)) {
            setWorldTime(data.hour);
        }
    }

    function handleWarpUpdated(data) {
        setWarpPoints(data?.points || []);
    }

    function handleWorldUpdated(data) {
        if (!data) return;

        if (data.mapId) {
            applyMapChange({
                mapId: data.mapId,
                position: data.position
            });
        }

        if (data.weather) {
            setWeather(data.weather);
        }

        if (Number.isFinite(data.hour)) {
            setWorldTime(data.hour);
        }

        notify("onWorldUpdated", getWorldInfo());
    }

    function handleError(data) {
        notify("onError", data);
    }

    // =====================================
    // CALLBACKS
    // =====================================

    function setCallbacks(newCallbacks = {}) {
        Object.keys(callbacks).forEach(key => {
            if (typeof newCallbacks[key] === "function") {
                callbacks[key] = newCallbacks[key];
            }
        });
    }

    // =====================================
    // INITIALIZATION
    // =====================================

    function loadDefaultMaps() {
        Object.values(MAP_DATABASE).forEach(registerMap);
    }

    const SOCKET_EVENTS = {
        "world:map-changed": handleMapChanged,
        "world:weather-changed": handleWeatherChanged,
        "world:time-changed": handleTimeChanged,
        "world:warp-updated": handleWarpUpdated,
        "world:updated": handleWorldUpdated,
        "world:error": handleError
    };

    function init(newSocket) {
        if (!newSocket) {
            console.error("[WorldSystem] Socket is required.");
            return false;
        }

        if (initialized) {
            removeSocketEvents();
        }

        socket = newSocket;

        loadDefaultMaps();

        Object.entries(SOCKET_EVENTS).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        initialized = true;

        return true;
    }

    function removeSocketEvents() {
        if (!socket) return;

        Object.entries(SOCKET_EVENTS).forEach(([event, handler]) => {
            socket.off(event, handler);
        });
    }

    function destroy() {
        removeSocketEvents();

        socket = null;
        initialized = false;

        maps.clear();
        warpPoints.clear();

        currentMap = "starting_village";
        currentWeather = "clear";
        currentTime = 12;
    }

    window.WorldSystem = {
        init,
        destroy,

        registerMap,
        getMap,
        getAllMaps,
        getCurrentMap,
        getCurrentMapId,
        changeMap,

        registerWarpPoint,
        getWarpPoints,
        useWarpPoint,

        getWeather,
        getAvailableWeather,

        setWorldTime,
        getWorldTime,
        getTimePeriod,
        isDaytime,
        isNighttime,

        isSafeZone,
        isPvPEnabled,
        isWeatherEnabled,
        getPlayerPosition,
        isInsideMap,

        requestWorldData,
        getWorldInfo,

        setCallbacks
    };

})();
