/* =========================================
   ECHO ISLES RPG
   Party System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const MAX_PARTY_MEMBERS = 5;
    const INVITE_TIMEOUT = 60000;

    let socket = null;
    let currentParty = null;

    const invitations = new Map();
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

    function notify(type, data) {
        listeners.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error("[PartySystem]", error);
            }
        });

        window.dispatchEvent(
            new CustomEvent("echo:party", {
                detail: { type, data }
            })
        );
    }

    function emit(event, data) {
        if (!socket || !socket.connected) {
            return false;
        }

        socket.emit(event, data);
        return true;
    }

    function setSocket(newSocket) {
        if (!newSocket) return false;

        if (socket === newSocket) return true;

        destroySocketEvents();

        socket = newSocket;

        socket.on("party:updated", handlePartyUpdated);
        socket.on("party:invite", handleInvitation);
        socket.on("party:invite-result", handleInviteResult);
        socket.on("party:error", handleError);
        socket.on("party:disbanded", handleDisbanded);

        return true;
    }

    function destroySocketEvents() {
        if (!socket) return;

        socket.off("party:updated", handlePartyUpdated);
        socket.off("party:invite", handleInvitation);
        socket.off("party:invite-result", handleInviteResult);
        socket.off("party:error", handleError);
        socket.off("party:disbanded", handleDisbanded);

        socket = null;
    }

    function createParty() {
        if (currentParty) {
            return {
                success: false,
                message: "คุณอยู่ในปาร์ตี้แล้ว"
            };
        }

        if (!emit("party:create", {})) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        return {
            success: true,
            message: "ส่งคำขอสร้างปาร์ตี้แล้ว"
        };
    }

    function invitePlayer(targetId) {
        if (!currentParty) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในปาร์ตี้"
            };
        }

        if (!targetId || targetId === getPlayerId()) {
            return {
                success: false,
                message: "ผู้เล่นเป้าหมายไม่ถูกต้อง"
            };
        }

        if (currentParty.leaderId !== getPlayerId()) {
            return {
                success: false,
                message: "เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เชิญสมาชิกได้"
            };
        }

        if (currentParty.members.length >= MAX_PARTY_MEMBERS) {
            return {
                success: false,
                message: "ปาร์ตี้เต็มแล้ว"
            };
        }

        if (!emit("party:invite", { targetId })) {
            return {
                success: false,
                message: "ส่งคำเชิญไม่สำเร็จ"
            };
        }

        return {
            success: true,
            message: "ส่งคำเชิญแล้ว"
        };
    }

    function handleInvitation(data) {
        if (!data || !data.partyId || !data.leaderId) {
            return;
        }

        const invitation = {
            partyId: data.partyId,
            leaderId: data.leaderId,
            leaderName: data.leaderName || "Adventurer",
            expiresAt: Date.now() + INVITE_TIMEOUT
        };

        invitations.set(data.partyId, invitation);

        notify("invitation", invitation);
    }

    function acceptInvitation(partyId) {
        const invitation = invitations.get(partyId);

        if (!invitation) {
            return {
                success: false,
                message: "ไม่พบคำเชิญ"
            };
        }

        if (Date.now() > invitation.expiresAt) {
            invitations.delete(partyId);

            return {
                success: false,
                message: "คำเชิญหมดอายุแล้ว"
            };
        }

        if (!emit("party:accept", { partyId })) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        invitations.delete(partyId);

        return {
            success: true,
            message: "ส่งคำขอเข้าปาร์ตี้แล้ว"
        };
    }

    function rejectInvitation(partyId) {
        if (!invitations.has(partyId)) {
            return false;
        }

        emit("party:reject", { partyId });

        invitations.delete(partyId);

        return true;
    }

    function leaveParty() {
        if (!currentParty) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในปาร์ตี้"
            };
        }

        if (!emit("party:leave", {})) {
            return {
                success: false,
                message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
            };
        }

        return {
            success: true,
            message: "ส่งคำขอออกจากปาร์ตี้แล้ว"
        };
    }

    function kickMember(targetId) {
        if (!currentParty) {
            return {
                success: false,
                message: "ไม่พบปาร์ตี้"
            };
        }

        if (currentParty.leaderId !== getPlayerId()) {
            return {
                success: false,
                message: "คุณไม่ใช่หัวหน้าปาร์ตี้"
            };
        }

        if (!targetId || targetId === getPlayerId()) {
            return {
                success: false,
                message: "สมาชิกเป้าหมายไม่ถูกต้อง"
            };
        }

        if (!emit("party:kick", { targetId })) {
            return {
                success: false,
                message: "ไม่สามารถส่งคำขอได้"
            };
        }

        return {
            success: true,
            message: "ส่งคำขอเตะสมาชิกแล้ว"
        };
    }

    function transferLeadership(targetId) {
        if (!currentParty) {
            return {
                success: false,
                message: "ไม่พบปาร์ตี้"
            };
        }

        if (currentParty.leaderId !== getPlayerId()) {
            return {
                success: false,
                message: "คุณไม่ใช่หัวหน้าปาร์ตี้"
            };
        }

        if (!targetId || targetId === getPlayerId()) {
            return {
                success: false,
                message: "สมาชิกเป้าหมายไม่ถูกต้อง"
            };
        }

        if (!emit("party:transfer-leader", { targetId })) {
            return {
                success: false,
                message: "ไม่สามารถส่งคำขอได้"
            };
        }

        return {
            success: true,
            message: "ส่งคำขอเปลี่ยนหัวหน้าปาร์ตี้แล้ว"
        };
    }

    function handlePartyUpdated(data) {
        if (!data || !data.party) return;

        currentParty = {
            id: data.party.id,
            leaderId: data.party.leaderId,
            members: Array.isArray(data.party.members)
                ? data.party.members.map(member => ({
                    id: member.id,
                    name: member.name,
                    level: member.level || 1,
                    hp: member.hp || 100,
                    maxHp: member.maxHp || 100,
                    map: member.map || "starting_village",
                    online: Boolean(member.online)
                }))
                : []
        };

        if (!currentParty.members.some(
            member => member.id === getPlayerId()
        )) {
            currentParty = null;
        }

        notify("updated", getPartyInfo());
    }

    function handleInviteResult(data) {
        notify("invite-result", data);
    }

    function handleError(data) {
        notify("error", data);
    }

    function handleDisbanded(data) {
        currentParty = null;
        notify("disbanded", data);
    }

    function getPartyInfo() {
        if (!currentParty) return null;

        return {
            id: currentParty.id,
            leaderId: currentParty.leaderId,
            members: currentParty.members.map(member => ({
                ...member
            })),
            memberCount: currentParty.members.length,
            maxMembers: MAX_PARTY_MEMBERS
        };
    }

    function getMembers() {
        return currentParty
            ? currentParty.members.map(member => ({ ...member }))
            : [];
    }

    function getMember(targetId) {
        if (!currentParty) return null;

        const member = currentParty.members.find(
            item => item.id === targetId
        );

        return member ? { ...member } : null;
    }

    function isInParty() {
        return Boolean(currentParty);
    }

    function isLeader() {
        return Boolean(
            currentParty &&
            currentParty.leaderId === getPlayerId()
        );
    }

    function onEvent(callback) {
        if (typeof callback !== "function") {
            return () => {};
        }

        listeners.add(callback);

        return () => listeners.delete(callback);
    }

    function clearInvitations() {
        invitations.clear();
    }

    function destroy() {
        destroySocketEvents();

        currentParty = null;
        invitations.clear();
        listeners.clear();

        console.log("[PartySystem] Destroyed");
    }

    window.PartySystem = {
        init(options = {}) {
            if (options.socket) {
                setSocket(options.socket);
            }

            console.log("[PartySystem] Initialized");
            return true;
        },

        setSocket,

        createParty,
        invitePlayer,

        acceptInvitation,
        rejectInvitation,

        leaveParty,
        kickMember,
        transferLeadership,

        getPartyInfo,
        getMembers,
        getMember,

        isInParty,
        isLeader,

        onEvent,
        clearInvitations,
        destroy
    };

})();
