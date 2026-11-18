/* =========================================
   ECHO ISLES RPG
   Chat System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const MAX_MESSAGE_LENGTH = 200;
    const MAX_HISTORY = 100;
    const MESSAGE_COOLDOWN = 1000;

    const CHANNELS = {
        GLOBAL: "global",
        LOCAL: "local",
        WHISPER: "whisper",
        GUILD: "guild"
    };

    const chatHistory = {
        global: [],
        local: [],
        whisper: [],
        guild: []
    };

    let socket = null;
    let initialized = false;
    let lastMessageTime = 0;

    const listeners = new Set();

    function getPlayer() {
        return window.ECHO_GAME?.player || null;
    }

    function getPlayerId() {
        return getPlayer()?.id || null;
    }

    function getPlayerName() {
        return getPlayer()?.name || "Adventurer";
    }

    function getCurrentMap() {
        return getPlayer()?.map || "starting_village";
    }

    function emit(eventName, data) {
        if (!socket || !socket.connected) {
            return false;
        }

        socket.emit(eventName, data);
        return true;
    }

    function notifyListeners(type, data) {
        listeners.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error("[ChatSystem] Listener error:", error);
            }
        });

        window.dispatchEvent(
            new CustomEvent("echo:chat", {
                detail: {
                    type,
                    data
                }
            })
        );
    }

    function addHistory(channel, message) {
        if (!chatHistory[channel]) {
            return;
        }

        chatHistory[channel].push(message);

        if (chatHistory[channel].length > MAX_HISTORY) {
            chatHistory[channel].shift();
        }

        notifyListeners("message", message);
    }

    function validateMessage(message) {
        if (typeof message !== "string") {
            return {
                success: false,
                message: "ข้อความไม่ถูกต้อง"
            };
        }

        message = message.trim();

        if (!message) {
            return {
                success: false,
                message: "กรุณาพิมพ์ข้อความ"
            };
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return {
                success: false,
                message: "ข้อความยาวเกิน 200 ตัวอักษร"
            };
        }

        return {
            success: true,
            message
        };
    }

    function checkCooldown() {
        const now = Date.now();

        if (now - lastMessageTime < MESSAGE_COOLDOWN) {
            return false;
        }

        lastMessageTime = now;
        return true;
    }

    function sendMessage(channel, message, targetId = null) {
        if (!Object.values(CHANNELS).includes(channel)) {
            return {
                success: false,
                message: "ไม่พบช่องแชท"
            };
        }

        const validation = validateMessage(message);

        if (!validation.success) {
            return validation;
        }

        if (!socket || !socket.connected) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        if (!checkCooldown()) {
            return {
                success: false,
                message: "กรุณารอสักครู่ก่อนส่งข้อความอีกครั้ง"
            };
        }

        const payload = {
            channel,
            message: validation.message
        };

        if (channel === CHANNELS.WHISPER) {
            if (!targetId || typeof targetId !== "string") {
                return {
                    success: false,
                    message: "กรุณาระบุผู้รับข้อความ"
                };
            }

            payload.targetId = targetId;
        }

        if (channel === CHANNELS.LOCAL) {
            payload.map = getCurrentMap();
        }

        if (channel === CHANNELS.GUILD) {
            const guildId = window.GuildSystem?.getCurrentGuildId?.();

            if (!guildId) {
                return {
                    success: false,
                    message: "คุณไม่ได้อยู่ในกิลด์"
                };
            }

            payload.guildId = guildId;
        }

        const sent = emit("chat:send", payload);

        if (!sent) {
            return {
                success: false,
                message: "ไม่สามารถส่งข้อความได้"
            };
        }

        return {
            success: true,
            message: "ส่งข้อความแล้ว"
        };
    }

    function sendGlobal(message) {
        return sendMessage(CHANNELS.GLOBAL, message);
    }

    function sendLocal(message) {
        return sendMessage(CHANNELS.LOCAL, message);
    }

    function sendWhisper(targetId, message) {
        return sendMessage(
            CHANNELS.WHISPER,
            message,
            targetId
        );
    }

    function sendGuild(message) {
        return sendMessage(CHANNELS.GUILD, message);
    }

    function receiveMessage(data) {
        if (!data || typeof data !== "object") {
            return;
        }

        const channel = data.channel;

        if (!chatHistory[channel]) {
            return;
        }

        if (typeof data.message !== "string") {
            return;
        }

        const message = {
            id: data.id || `${Date.now()}_${Math.random()}`,
            channel,
            senderId: String(data.senderId || ""),
            senderName: String(data.senderName || "Adventurer"),
            message: data.message.slice(0, MAX_MESSAGE_LENGTH),
            targetId: data.targetId || null,
            map: data.map || null,
            guildId: data.guildId || null,
            timestamp: Number(data.timestamp) || Date.now()
        };

        addHistory(channel, message);
    }

    function clearHistory(channel) {
        if (!chatHistory[channel]) {
            return false;
        }

        chatHistory[channel] = [];

        notifyListeners("clear", {
            channel
        });

        return true;
    }

    function getHistory(channel) {
        if (!chatHistory[channel]) {
            return [];
        }

        return chatHistory[channel].map(message => ({
            ...message
        }));
    }

    function getAllHistory() {
        return {
            global: getHistory(CHANNELS.GLOBAL),
            local: getHistory(CHANNELS.LOCAL),
            whisper: getHistory(CHANNELS.WHISPER),
            guild: getHistory(CHANNELS.GUILD)
        };
    }

    function onMessage(callback) {
        if (typeof callback !== "function") {
            return () => {};
        }

        listeners.add(callback);

        return function unsubscribe() {
            listeners.delete(callback);
        };
    }

    function bindSocket(newSocket) {
        if (!newSocket) {
            return false;
        }

        if (socket === newSocket && initialized) {
            return true;
        }

        unbindSocket();

        socket = newSocket;

        socket.on("chat:message", receiveMessage);

        socket.on("chat:error", data => {
            notifyListeners("error", data);
        });

        socket.on("chat:system", data => {
            notifyListeners("system", data);
        });

        initialized = true;

        console.log("[ChatSystem] Socket connected");

        return true;
    }

    function unbindSocket() {
        if (!socket) {
            return;
        }

        socket.off("chat:message", receiveMessage);

        socket.off("chat:error");
        socket.off("chat:system");

        socket = null;
        initialized = false;
    }

    function setSocket(newSocket) {
        return bindSocket(newSocket);
    }

    function isConnected() {
        return Boolean(socket && socket.connected);
    }

    function getChannels() {
        return { ...CHANNELS };
    }

    function getStatus() {
        return {
            connected: isConnected(),
            playerId: getPlayerId(),
            playerName: getPlayerName(),
            currentMap: getCurrentMap(),
            channels: Object.keys(CHANNELS)
        };
    }

    function destroy() {
        unbindSocket();
        listeners.clear();

        Object.keys(chatHistory).forEach(channel => {
            chatHistory[channel] = [];
        });

        console.log("[ChatSystem] Destroyed");
    }

    window.ChatSystem = {
        init(options = {}) {
            if (options.socket) {
                bindSocket(options.socket);
            }

            console.log("[ChatSystem] Initialized");
            return true;
        },

        setSocket,
        isConnected,

        sendMessage,
        sendGlobal,
        sendLocal,
        sendWhisper,
        sendGuild,

        receiveMessage,

        getHistory,
        getAllHistory,
        clearHistory,

        onMessage,

        getChannels,
        getStatus,

        destroy
    };

})();
