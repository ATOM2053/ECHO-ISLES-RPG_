(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let bankGold = 0;
    let storage = [];
    let storageCapacity = 100;

    const callbacks = {
        onBankUpdated: null,
        onStorageUpdated: null,
        onGoldDeposited: null,
        onGoldWithdrawn: null,
        onItemDeposited: null,
        onItemWithdrawn: null,
        onError: null
    };

    const CONFIG = {
        MAX_GOLD: 999999999,
        MAX_QUANTITY: 9999,
        DEFAULT_CAPACITY: 100
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

    function validAmount(amount) {
        return Number.isSafeInteger(amount) &&
            amount > 0 &&
            amount <= CONFIG.MAX_GOLD;
    }

    function normalizeItem(item) {
        if (!item || !item.itemId) {
            return null;
        }

        return {
            itemId: String(item.itemId),
            name: String(item.name || "Unknown Item"),
            quantity: Number(item.quantity) || 0,
            rarity: String(item.rarity || "common"),
            category: String(item.category || "misc")
        };
    }

    function updateBank(data = {}) {
        if (Number.isSafeInteger(data.gold) && data.gold >= 0) {
            bankGold = data.gold;
        }

        if (
            Number.isInteger(data.capacity) &&
            data.capacity > 0
        ) {
            storageCapacity = data.capacity;
        }

        notify("onBankUpdated", getBankInfo());
    }

    function updateStorage(items) {
        storage = Array.isArray(items)
            ? items.map(normalizeItem).filter(Boolean)
            : [];

        notify("onStorageUpdated", getStorage());
    }

    function depositGold(amount) {
        if (!validAmount(amount)) {
            return {
                success: false,
                message: "จำนวน Gold ไม่ถูกต้อง"
            };
        }

        const sent = emit("bank:deposit-gold", {
            amount
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอฝาก Gold แล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function withdrawGold(amount) {
        if (!validAmount(amount)) {
            return {
                success: false,
                message: "จำนวน Gold ไม่ถูกต้อง"
            };
        }

        const sent = emit("bank:withdraw-gold", {
            amount
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอถอน Gold แล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function depositItem(itemId, quantity = 1) {
        if (
            typeof itemId !== "string" ||
            !itemId.trim() ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > CONFIG.MAX_QUANTITY
        ) {
            return {
                success: false,
                message: "ข้อมูลไอเทมไม่ถูกต้อง"
            };
        }

        const sent = emit("bank:deposit-item", {
            itemId,
            quantity
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอฝากไอเทมแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function withdrawItem(itemId, quantity = 1) {
        if (
            typeof itemId !== "string" ||
            !itemId.trim() ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > CONFIG.MAX_QUANTITY
        ) {
            return {
                success: false,
                message: "ข้อมูลไอเทมไม่ถูกต้อง"
            };
        }

        const sent = emit("bank:withdraw-item", {
            itemId,
            quantity
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอถอนไอเทมแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function requestBankData() {
        return emit("bank:get-data");
    }

    function requestStorage() {
        return emit("bank:get-storage");
    }

    function getBankInfo() {
        return {
            gold: bankGold,
            capacity: storageCapacity,
            usedSlots: storage.length,
            availableSlots: Math.max(
                0,
                storageCapacity - storage.length
            )
        };
    }

    function getStorage() {
        return storage.map(item => ({ ...item }));
    }

    function getItem(itemId) {
        return storage.find(item =>
            item.itemId === String(itemId)
        ) || null;
    }

    function searchStorage(keyword) {
        const query = String(keyword || "")
            .trim()
            .toLowerCase();

        if (!query) {
            return getStorage();
        }

        return getStorage().filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.itemId.toLowerCase().includes(query)
        );
    }

    function handleBankUpdated(data) {
        updateBank(data || {});
    }

    function handleStorageUpdated(data) {
        updateStorage(data?.items || []);
    }

    function handleGoldDeposited(data) {
        updateBank(data || {});
        notify("onGoldDeposited", data);
    }

    function handleGoldWithdrawn(data) {
        updateBank(data || {});
        notify("onGoldWithdrawn", data);
    }

    function handleItemDeposited(data) {
        if (Array.isArray(data?.items)) {
            updateStorage(data.items);
        }

        notify("onItemDeposited", data);
    }

    function handleItemWithdrawn(data) {
        if (Array.isArray(data?.items)) {
            updateStorage(data.items);
        }

        notify("onItemWithdrawn", data);
    }

    function handleError(data) {
        notify("onError", data);
    }

    function setCallbacks(newCallbacks = {}) {
        Object.keys(callbacks).forEach(key => {
            if (typeof newCallbacks[key] === "function") {
                callbacks[key] = newCallbacks[key];
            }
        });
    }

    function bindSocketEvents() {
        socket.on("bank:updated", handleBankUpdated);
        socket.on("bank:storage", handleStorageUpdated);
        socket.on("bank:gold-deposited", handleGoldDeposited);
        socket.on("bank:gold-withdrawn", handleGoldWithdrawn);
        socket.on("bank:item-deposited", handleItemDeposited);
        socket.on("bank:item-withdrawn", handleItemWithdrawn);
        socket.on("bank:error", handleError);
    }

    function removeSocketEvents() {
        if (!socket) return;

        socket.off("bank:updated", handleBankUpdated);
        socket.off("bank:storage", handleStorageUpdated);
        socket.off("bank:gold-deposited", handleGoldDeposited);
        socket.off("bank:gold-withdrawn", handleGoldWithdrawn);
        socket.off("bank:item-deposited", handleItemDeposited);
        socket.off("bank:item-withdrawn", handleItemWithdrawn);
        socket.off("bank:error", handleError);
    }

    function init(newSocket) {
        if (!newSocket) {
            console.error("[BankSystem] Socket is required.");
            return false;
        }

        if (initialized) {
            removeSocketEvents();
        }

        socket = newSocket;
        bindSocketEvents();

        initialized = true;

        return true;
    }

    function destroy() {
        removeSocketEvents();

        socket = null;
        initialized = false;

        bankGold = 0;
        storage = [];
        storageCapacity = CONFIG.DEFAULT_CAPACITY;
    }

    window.BankSystem = {
        init,
        destroy,

        depositGold,
        withdrawGold,
        depositItem,
        withdrawItem,

        requestBankData,
        requestStorage,

        getBankInfo,
        getStorage,
        getItem,
        searchStorage,

        setCallbacks
    };

})();
