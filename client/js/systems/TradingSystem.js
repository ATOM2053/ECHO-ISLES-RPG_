(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let currentTrade = null;
    let incomingInvitations = [];

    const callbacks = {
        onInvitation: null,
        onTradeStarted: null,
        onTradeUpdated: null,
        onTradeCompleted: null,
        onTradeCancelled: null,
        onTradeError: null
    };

    const TRADE_CONFIG = {
        MAX_ITEMS: 12,
        MAX_GOLD: 999999999,
        MAX_ITEM_QUANTITY: 9999
    };

    function notify(name, data) {
        if (typeof callbacks[name] === "function") {
            callbacks[name](data);
        }
    }

    function emit(event, data = {}) {
        if (!socket || !socket.connected) {
            return false;
        }

        socket.emit(event, data);
        return true;
    }

    function isValidQuantity(quantity) {
        return (
            Number.isInteger(quantity) &&
            quantity > 0 &&
            quantity <= TRADE_CONFIG.MAX_ITEM_QUANTITY
        );
    }

    function isValidGold(amount) {
        return (
            Number.isInteger(amount) &&
            amount >= 0 &&
            amount <= TRADE_CONFIG.MAX_GOLD
        );
    }

    function getTradeId() {
        return currentTrade?.id || null;
    }

    function startTrade(playerId) {
        const id = String(playerId || "").trim();

        if (!id) {
            return {
                success: false,
                message: "ไม่พบผู้เล่นที่ต้องการแลกเปลี่ยน"
            };
        }

        if (!socket || !socket.connected) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        if (currentTrade) {
            return {
                success: false,
                message: "คุณกำลังแลกเปลี่ยนอยู่"
            };
        }

        emit("trade:invite", {
            playerId: id
        });

        return {
            success: true,
            message: "ส่งคำเชิญแลกเปลี่ยนแล้ว"
        };
    }

    function acceptInvitation(tradeId) {
        if (!tradeId) return false;

        return emit("trade:accept", {
            tradeId
        });
    }

    function rejectInvitation(tradeId) {
        if (!tradeId) return false;

        const sent = emit("trade:reject", {
            tradeId
        });

        if (sent) {
            incomingInvitations = incomingInvitations.filter(
                invitation => invitation.id !== tradeId
            );
        }

        return sent;
    }

    function addItem(itemId, quantity = 1) {
        if (!currentTrade) {
            return {
                success: false,
                message: "ไม่มีรายการแลกเปลี่ยน"
            };
        }

        if (typeof itemId !== "string" || !itemId.trim()) {
            return {
                success: false,
                message: "รหัสไอเทมไม่ถูกต้อง"
            };
        }

        if (!isValidQuantity(quantity)) {
            return {
                success: false,
                message: "จำนวนไอเทมไม่ถูกต้อง"
            };
        }

        return emit("trade:add-item", {
            tradeId: currentTrade.id,
            itemId,
            quantity
        });
    }

    function removeItem(itemId) {
        if (!currentTrade || !itemId) {
            return false;
        }

        return emit("trade:remove-item", {
            tradeId: currentTrade.id,
            itemId
        });
    }

    function setGold(amount) {
        if (!currentTrade) {
            return {
                success: false,
                message: "ไม่มีรายการแลกเปลี่ยน"
            };
        }

        if (!isValidGold(amount)) {
            return {
                success: false,
                message: "จำนวน Gold ไม่ถูกต้อง"
            };
        }

        return emit("trade:set-gold", {
            tradeId: currentTrade.id,
            amount
        });
    }

    function confirmTrade() {
        if (!currentTrade) {
            return false;
        }

        return emit("trade:confirm", {
            tradeId: currentTrade.id
        });
    }

    function unconfirmTrade() {
        if (!currentTrade) {
            return false;
        }

        return emit("trade:unconfirm", {
            tradeId: currentTrade.id
        });
    }

    function cancelTrade() {
        if (!currentTrade) {
            return false;
        }

        return emit("trade:cancel", {
            tradeId: currentTrade.id
        });
    }

    function getCurrentTrade() {
        return currentTrade;
    }

    function getInvitations() {
        return [...incomingInvitations];
    }

    function isTrading() {
        return currentTrade !== null;
    }

    function handleInvitation(data) {
        if (!data || !data.id) return;

        incomingInvitations.push(data);

        notify("onInvitation", data);
    }

    function handleTradeStarted(data) {
        if (!data || !data.id) return;

        currentTrade = {
            id: data.id,
            status: "active",
            players: data.players || [],
            offers: data.offers || {},
            confirmed: data.confirmed || {},
            createdAt: data.createdAt || Date.now()
        };

        notify("onTradeStarted", currentTrade);
    }

    function handleTradeUpdated(data) {
        if (!data || !currentTrade) return;

        if (data.id !== currentTrade.id) return;

        currentTrade = {
            ...currentTrade,
            ...data
        };

        notify("onTradeUpdated", currentTrade);
    }

    function handleTradeCompleted(data) {
        if (!data) return;

        const completedTrade = currentTrade;

        currentTrade = null;

        notify("onTradeCompleted", {
            trade: completedTrade,
            result: data
        });
    }

    function handleTradeCancelled(data) {
        const cancelledTrade = currentTrade;

        currentTrade = null;

        notify("onTradeCancelled", {
            trade: cancelledTrade,
            reason: data?.reason || "การแลกเปลี่ยนถูกยกเลิก"
        });
    }

    function handleTradeError(data) {
        notify("onTradeError", data);
    }

    function setCallbacks(newCallbacks = {}) {
        Object.keys(callbacks).forEach(key => {
            if (typeof newCallbacks[key] === "function") {
                callbacks[key] = newCallbacks[key];
            }
        });
    }

    function bindSocketEvents() {
        if (!socket) return;

        socket.on("trade:invitation", handleInvitation);
        socket.on("trade:started", handleTradeStarted);
        socket.on("trade:updated", handleTradeUpdated);
        socket.on("trade:completed", handleTradeCompleted);
        socket.on("trade:cancelled", handleTradeCancelled);
        socket.on("trade:error", handleTradeError);
    }

    function removeSocketEvents() {
        if (!socket) return;

        socket.off("trade:invitation", handleInvitation);
        socket.off("trade:started", handleTradeStarted);
        socket.off("trade:updated", handleTradeUpdated);
        socket.off("trade:completed", handleTradeCompleted);
        socket.off("trade:cancelled", handleTradeCancelled);
        socket.off("trade:error", handleTradeError);
    }

    function init(newSocket) {
        if (!newSocket) {
            console.error("[TradingSystem] Socket is required.");
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

        currentTrade = null;
        incomingInvitations = [];
    }

    window.TradingSystem = {
        init,
        destroy,

        startTrade,
        acceptInvitation,
        rejectInvitation,

        addItem,
        removeItem,
        setGold,

        confirmTrade,
        unconfirmTrade,
        cancelTrade,

        getCurrentTrade,
        getInvitations,
        isTrading,
        getTradeId,

        setCallbacks
    };

})();
