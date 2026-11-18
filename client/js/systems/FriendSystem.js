(function () {
    "use strict";

    const friends = new Map();
    const incomingRequests = new Map();
    const outgoingRequests = new Map();
    const blockedPlayers = new Map();

    let socket = null;
    let initialized = false;

    const callbacks = {
        onFriendListUpdated: null,
        onRequestReceived: null,
        onRequestSent: null,
        onFriendAdded: null,
        onFriendRemoved: null,
        onFriendStatusChanged: null,
        onBlocked: null,
        onUnblocked: null,
        onError: null
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

    function normalizePlayer(player) {
        if (!player || !player.id) {
            return null;
        }

        return {
            id: String(player.id),
            name: String(player.name || "Adventurer"),
            level: Number(player.level) || 1,
            status: player.status || "offline",
            map: player.map || null,
            lastSeen: player.lastSeen || null
        };
    }

    function setFriendList(list) {
        friends.clear();

        if (!Array.isArray(list)) {
            return;
        }

        list.forEach(data => {
            const player = normalizePlayer(data);

            if (player) {
                friends.set(player.id, player);
            }
        });

        notify("onFriendListUpdated", getFriends());
    }

    function addFriend(data) {
        const player = normalizePlayer(data);

        if (!player) {
            return false;
        }

        friends.set(player.id, player);

        incomingRequests.delete(player.id);
        outgoingRequests.delete(player.id);

        notify("onFriendAdded", player);
        notify("onFriendListUpdated", getFriends());

        return true;
    }

    function removeFriend(playerId) {
        const id = String(playerId);

        const player = friends.get(id);

        if (!player) {
            return false;
        }

        friends.delete(id);

        notify("onFriendRemoved", player);
        notify("onFriendListUpdated", getFriends());

        return true;
    }

    function updateFriendStatus(data) {
        if (!data || !data.id) {
            return false;
        }

        const id = String(data.id);
        const player = friends.get(id);

        if (!player) {
            return false;
        }

        player.status = data.status || "offline";
        player.map = data.map || null;
        player.lastSeen = data.lastSeen || player.lastSeen;

        notify("onFriendStatusChanged", player);

        return true;
    }

    function receiveRequest(data) {
        const player = normalizePlayer(data);

        if (!player || blockedPlayers.has(player.id)) {
            return false;
        }

        incomingRequests.set(player.id, player);

        notify("onRequestReceived", player);

        return true;
    }

    function sendFriendRequest(playerId) {
        const id = String(playerId || "").trim();

        if (!id) {
            return {
                success: false,
                message: "กรุณาระบุผู้เล่น"
            };
        }

        if (friends.has(id)) {
            return {
                success: false,
                message: "ผู้เล่นนี้เป็นเพื่อนของคุณอยู่แล้ว"
            };
        }

        if (blockedPlayers.has(id)) {
            return {
                success: false,
                message: "ผู้เล่นนี้อยู่ในรายการบล็อก"
            };
        }

        if (outgoingRequests.has(id)) {
            return {
                success: false,
                message: "คุณส่งคำขอไปแล้ว"
            };
        }

        const sent = emit("friend:request", {
            playerId: id
        });

        if (!sent) {
            return {
                success: false,
                message: "ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        outgoingRequests.set(id, {
            playerId: id,
            createdAt: Date.now()
        });

        return {
            success: true,
            message: "ส่งคำขอเป็นเพื่อนแล้ว"
        };
    }

    function acceptRequest(playerId) {
        const id = String(playerId);

        if (!incomingRequests.has(id)) {
            return false;
        }

        return emit("friend:accept", {
            playerId: id
        });
    }

    function rejectRequest(playerId) {
        const id = String(playerId);

        if (!incomingRequests.has(id)) {
            return false;
        }

        const sent = emit("friend:reject", {
            playerId: id
        });

        if (sent) {
            incomingRequests.delete(id);
        }

        return sent;
    }

    function cancelRequest(playerId) {
        const id = String(playerId);

        if (!outgoingRequests.has(id)) {
            return false;
        }

        const sent = emit("friend:cancel", {
            playerId: id
        });

        if (sent) {
            outgoingRequests.delete(id);
        }

        return sent;
    }

    function requestRemoveFriend(playerId) {
        const id = String(playerId);

        if (!friends.has(id)) {
            return false;
        }

        return emit("friend:remove", {
            playerId: id
        });
    }

    function blockPlayer(playerId, playerName = "Unknown") {
        const id = String(playerId || "").trim();

        if (!id) {
            return false;
        }

        if (blockedPlayers.has(id)) {
            return false;
        }

        const sent = emit("friend:block", {
            playerId: id
        });

        if (!sent) {
            return false;
        }

        blockedPlayers.set(id, {
            id,
            name: playerName,
            blockedAt: Date.now()
        });

        friends.delete(id);
        incomingRequests.delete(id);
        outgoingRequests.delete(id);

        notify("onBlocked", getBlockedPlayers());

        return true;
    }

    function unblockPlayer(playerId) {
        const id = String(playerId);

        if (!blockedPlayers.has(id)) {
            return false;
        }

        const sent = emit("friend:unblock", {
            playerId: id
        });

        if (!sent) {
            return false;
        }

        blockedPlayers.delete(id);

        notify("onUnblocked", getBlockedPlayers());

        return true;
    }

    function isFriend(playerId) {
        return friends.has(String(playerId));
    }

    function isBlocked(playerId) {
        return blockedPlayers.has(String(playerId));
    }

    function getFriends() {
        return Array.from(friends.values());
    }

    function getOnlineFriends() {
        return getFriends().filter(player => {
            return player.status === "online";
        });
    }

    function getOfflineFriends() {
        return getFriends().filter(player => {
            return player.status !== "online";
        });
    }

    function getFriend(playerId) {
        return friends.get(String(playerId)) || null;
    }

    function getIncomingRequests() {
        return Array.from(incomingRequests.values());
    }

    function getOutgoingRequests() {
        return Array.from(outgoingRequests.values());
    }

    function getBlockedPlayers() {
        return Array.from(blockedPlayers.values());
    }

    function setCallbacks(newCallbacks = {}) {
        Object.keys(callbacks).forEach(key => {
            if (typeof newCallbacks[key] === "function") {
                callbacks[key] = newCallbacks[key];
            }
        });
    }

    function bindSocketEvents() {
        if (!socket) {
            return;
        }

        socket.on("friend:list", data => {
            setFriendList(data?.friends || []);
        });

        socket.on("friend:request", data => {
            receiveRequest(data);
        });

        socket.on("friend:request-sent", data => {
            const id = String(data?.playerId || "");

            if (id) {
                outgoingRequests.set(id, {
                    playerId: id,
                    createdAt: Date.now()
                });

                notify("onRequestSent", data);
            }
        });

        socket.on("friend:accepted", data => {
            addFriend(data);
        });

        socket.on("friend:removed", data => {
            if (data?.playerId) {
                removeFriend(data.playerId);
            }
        });

        socket.on("friend:status", data => {
            updateFriendStatus(data);
        });

        socket.on("friend:blocked", data => {
            if (data?.playerId) {
                blockedPlayers.set(String(data.playerId), {
                    id: String(data.playerId),
                    name: data.name || "Unknown",
                    blockedAt: Date.now()
                });

                notify("onBlocked", getBlockedPlayers());
            }
        });

        socket.on("friend:unblocked", data => {
            if (data?.playerId) {
                blockedPlayers.delete(String(data.playerId));
                notify("onUnblocked", getBlockedPlayers());
            }
        });

        socket.on("friend:error", data => {
            notify("onError", data);
        });

        socket.on("friend:request-result", data => {
            if (!data?.playerId) {
                return;
            }

            const id = String(data.playerId);

            if (data.success) {
                outgoingRequests.set(id, {
                    playerId: id,
                    createdAt: Date.now()
                });
            } else {
                outgoingRequests.delete(id);
            }
        });
    }

    function init(newSocket) {
        if (!newSocket) {
            console.error("[FriendSystem] Socket is required.");
            return false;
        }

        if (socket && initialized) {
            socket.off("friend:list");
            socket.off("friend:request");
            socket.off("friend:request-sent");
            socket.off("friend:accepted");
            socket.off("friend:removed");
            socket.off("friend:status");
            socket.off("friend:blocked");
            socket.off("friend:unblocked");
            socket.off("friend:error");
            socket.off("friend:request-result");
        }

        socket = newSocket;

        bindSocketEvents();

        initialized = true;

        return true;
    }

    function destroy() {
        if (socket && initialized) {
            socket.off("friend:list");
            socket.off("friend:request");
            socket.off("friend:request-sent");
            socket.off("friend:accepted");
            socket.off("friend:removed");
            socket.off("friend:status");
            socket.off("friend:blocked");
            socket.off("friend:unblocked");
            socket.off("friend:error");
            socket.off("friend:request-result");
        }

        socket = null;
        initialized = false;

        friends.clear();
        incomingRequests.clear();
        outgoingRequests.clear();
        blockedPlayers.clear();
    }

    window.FriendSystem = {
        init,
        destroy,

        sendFriendRequest,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        requestRemoveFriend,

        blockPlayer,
        unblockPlayer,

        isFriend,
        isBlocked,

        getFriend,
        getFriends,
        getOnlineFriends,
        getOfflineFriends,
        getIncomingRequests,
        getOutgoingRequests,
        getBlockedPlayers,

        setCallbacks
    };

})();
