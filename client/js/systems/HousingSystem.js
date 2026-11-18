(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let myHouse = null;
    let furniture = [];
    let visitors = [];
    let garden = [];

    const callbacks = {
        onHouseUpdated: null,
        onHousePurchased: null,
        onHouseRented: null,
        onHouseReleased: null,
        onFurnitureUpdated: null,
        onVisitorJoined: null,
        onVisitorLeft: null,
        onGardenUpdated: null,
        onError: null
    };

    const CONFIG = {
        MAX_FURNITURE: 100,
        MAX_VISITORS: 20,
        MAX_FURNITURE_NAME_LENGTH: 40,
        MAX_COORDINATE: 10000
    };

    const HOUSE_TYPES = {
        small_house: {
            name: "บ้านหลังเล็ก",
            price: 10000,
            rentPrice: 500,
            capacity: 30
        },

        medium_house: {
            name: "บ้านขนาดกลาง",
            price: 50000,
            rentPrice: 2000,
            capacity: 60
        },

        large_house: {
            name: "บ้านหลังใหญ่",
            price: 150000,
            rentPrice: 5000,
            capacity: 100
        },

        royal_mansion: {
            name: "คฤหาสน์",
            price: 500000,
            rentPrice: 15000,
            capacity: 100
        }
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

    function validHouseType(type) {
        return Object.prototype.hasOwnProperty.call(
            HOUSE_TYPES,
            type
        );
    }

    function normalizeFurniture(item) {
        if (!item || !item.id || !item.itemId) {
            return null;
        }

        return {
            id: String(item.id),
            itemId: String(item.itemId),
            name: String(item.name || "Furniture"),
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            rotation: Number(item.rotation) || 0
        };
    }

    function normalizeHouse(data) {
        if (!data || !data.id) {
            return null;
        }

        return {
            id: String(data.id),
            ownerId: String(data.ownerId || ""),
            name: String(data.name || "My House"),
            type: String(data.type || "small_house"),
            mapId: String(data.mapId || "housing_area"),
            isPublic: Boolean(data.isPublic),
            isRented: Boolean(data.isRented),
            expiresAt: data.expiresAt || null,
            capacity: Number(data.capacity) || 30
        };
    }

    // =====================================
    // HOUSE MANAGEMENT
    // =====================================

    function purchaseHouse(type) {
        if (!validHouseType(type)) {
            return {
                success: false,
                message: "ไม่พบประเภทบ้านนี้"
            };
        }

        if (myHouse) {
            return {
                success: false,
                message: "คุณมีบ้านอยู่แล้ว"
            };
        }

        const sent = emit("house:purchase", {
            houseType: type
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอซื้อบ้านแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function rentHouse(type, durationDays = 7) {
        if (!validHouseType(type)) {
            return {
                success: false,
                message: "ไม่พบประเภทบ้านนี้"
            };
        }

        if (!Number.isInteger(durationDays) ||
            durationDays < 1 ||
            durationDays > 365) {
            return {
                success: false,
                message: "ระยะเวลาเช่าไม่ถูกต้อง"
            };
        }

        if (myHouse) {
            return {
                success: false,
                message: "คุณมีบ้านอยู่แล้ว"
            };
        }

        const sent = emit("house:rent", {
            houseType: type,
            durationDays
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอเช่าบ้านแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function releaseHouse() {
        if (!myHouse) {
            return false;
        }

        return emit("house:release", {
            houseId: myHouse.id
        });
    }

    function renameHouse(name) {
        if (!myHouse) {
            return false;
        }

        const houseName = String(name || "").trim();

        if (!houseName || houseName.length > 30) {
            return false;
        }

        return emit("house:rename", {
            houseId: myHouse.id,
            name: houseName
        });
    }

    function setHousePrivacy(isPublic) {
        if (!myHouse) {
            return false;
        }

        return emit("house:set-privacy", {
            houseId: myHouse.id,
            isPublic: Boolean(isPublic)
        });
    }

    // =====================================
    // FURNITURE
    // =====================================

    function placeFurniture(itemId, x, y) {
        if (!myHouse) {
            return {
                success: false,
                message: "คุณยังไม่มีบ้าน"
            };
        }

        if (typeof itemId !== "string" || !itemId.trim()) {
            return {
                success: false,
                message: "รหัสเฟอร์นิเจอร์ไม่ถูกต้อง"
            };
        }

        if (furniture.length >= CONFIG.MAX_FURNITURE) {
            return {
                success: false,
                message: "บ้านมีเฟอร์นิเจอร์เต็มแล้ว"
            };
        }

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            Math.abs(x) > CONFIG.MAX_COORDINATE ||
            Math.abs(y) > CONFIG.MAX_COORDINATE
        ) {
            return {
                success: false,
                message: "ตำแหน่งไม่ถูกต้อง"
            };
        }

        const sent = emit("house:place-furniture", {
            houseId: myHouse.id,
            itemId,
            x,
            y
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอวางเฟอร์นิเจอร์แล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function moveFurniture(furnitureId, x, y) {
        if (!myHouse || !furnitureId) {
            return false;
        }

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            Math.abs(x) > CONFIG.MAX_COORDINATE ||
            Math.abs(y) > CONFIG.MAX_COORDINATE
        ) {
            return false;
        }

        return emit("house:move-furniture", {
            houseId: myHouse.id,
            furnitureId: String(furnitureId),
            x,
            y
        });
    }

    function rotateFurniture(furnitureId, rotation) {
        if (!myHouse || !furnitureId) {
            return false;
        }

        if (!Number.isFinite(rotation)) {
            return false;
        }

        const normalizedRotation =
            ((rotation % 360) + 360) % 360;

        return emit("house:rotate-furniture", {
            houseId: myHouse.id,
            furnitureId: String(furnitureId),
            rotation: normalizedRotation
        });
    }

    function removeFurniture(furnitureId) {
        if (!myHouse || !furnitureId) {
            return false;
        }

        return emit("house:remove-furniture", {
            houseId: myHouse.id,
            furnitureId: String(furnitureId)
        });
    }

    function getFurniture() {
        return furniture.map(item => ({ ...item }));
    }

    // =====================================
    // VISITORS
    // =====================================

    function inviteVisitor(playerId) {
        if (!myHouse || !playerId) {
            return false;
        }

        return emit("house:invite", {
            houseId: myHouse.id,
            playerId: String(playerId)
        });
    }

    function kickVisitor(playerId) {
        if (!myHouse || !playerId) {
            return false;
        }

        return emit("house:kick-visitor", {
            houseId: myHouse.id,
            playerId: String(playerId)
        });
    }

    function leaveHouse() {
        if (!myHouse) {
            return false;
        }

        return emit("house:leave", {
            houseId: myHouse.id
        });
    }

    function getVisitors() {
        return visitors.map(visitor => ({ ...visitor }));
    }

    // =====================================
    // GARDEN
    // =====================================

    function plantSeed(seedId, plotId) {
        if (!myHouse || !seedId || !plotId) {
            return false;
        }

        return emit("house:plant-seed", {
            houseId: myHouse.id,
            seedId: String(seedId),
            plotId: String(plotId)
        });
    }

    function harvestPlant(plotId) {
        if (!myHouse || !plotId) {
            return false;
        }

        return emit("house:harvest", {
            houseId: myHouse.id,
            plotId: String(plotId)
        });
    }

    function getGarden() {
        return garden.map(plot => ({ ...plot }));
    }

    // =====================================
    // DATA
    // =====================================

    function requestHouseData() {
        return emit("house:get-data");
    }

    function getHouse() {
        return myHouse ? { ...myHouse } : null;
    }

    function getHouseTypes() {
        return Object.entries(HOUSE_TYPES).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    function isOwner() {
        const playerId = window.ECHO_GAME?.player?.id;

        return Boolean(
            myHouse &&
            playerId &&
            myHouse.ownerId === String(playerId)
        );
    }

    // =====================================
    // SOCKET EVENTS
    // =====================================

    function handleHouseUpdated(data) {
        myHouse = normalizeHouse(data?.house);

        if (Array.isArray(data?.furniture)) {
            furniture = data.furniture
                .map(normalizeFurniture)
                .filter(Boolean);
        }

        if (Array.isArray(data?.visitors)) {
            visitors = data.visitors;
        }

        if (Array.isArray(data?.garden)) {
            garden = data.garden;
        }

        notify("onHouseUpdated", {
            house: getHouse(),
            furniture: getFurniture(),
            visitors: getVisitors(),
            garden: getGarden()
        });
    }

    function handleHousePurchased(data) {
        myHouse = normalizeHouse(data?.house);

        notify("onHousePurchased", getHouse());
    }

    function handleHouseRented(data) {
        myHouse = normalizeHouse(data?.house);

        notify("onHouseRented", getHouse());
    }

    function handleHouseReleased() {
        myHouse = null;
        furniture = [];
        visitors = [];
        garden = [];

        notify("onHouseReleased", null);
    }

    function handleFurnitureUpdated(data) {
        if (!Array.isArray(data?.furniture)) {
            return;
        }

        furniture = data.furniture
            .map(normalizeFurniture)
            .filter(Boolean);

        notify("onFurnitureUpdated", getFurniture());
    }

    function handleVisitorJoined(data) {
        if (!data?.playerId) return;

        visitors.push(data);

        notify("onVisitorJoined", data);
    }

    function handleVisitorLeft(data) {
        if (!data?.playerId) return;

        visitors = visitors.filter(visitor =>
            String(visitor.playerId) !== String(data.playerId)
        );

        notify("onVisitor
