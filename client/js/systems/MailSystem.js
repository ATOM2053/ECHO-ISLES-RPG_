/* =========================================
   ECHO ISLES RPG
   Mail System
========================================= */

(function () {
    "use strict";

    const MailSystem = {

        socket: null,

        inbox: new Map(),
        sent: new Map(),

        currentMail: null,
        initialized: false,

        MAX_SUBJECT_LENGTH: 80,
        MAX_MESSAGE_LENGTH: 2000,
        MAX_ATTACHMENTS: 5,

        /* =====================================
           INITIALIZE
        ===================================== */

        init(options = {}) {

            if (this.initialized) return;

            this.socket = options.socket || null;

            this.bindSocketEvents();

            this.initialized = true;

            console.log("[MailSystem] Initialized");

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("mail:sync", data => {

                if (!data) return;

                if (Array.isArray(data.inbox)) {

                    this.inbox.clear();

                    data.inbox.forEach(mail => {
                        this.inbox.set(mail.id, mail);
                    });

                }

                if (Array.isArray(data.sent)) {

                    this.sent.clear();

                    data.sent.forEach(mail => {
                        this.sent.set(mail.id, mail);
                    });

                }

                this.emitEvent("mail:updated", {
                    inbox: this.getInbox(),
                    sent: this.getSent()
                });

            });

            this.socket.on("mail:received", mail => {

                if (!mail?.id) return;

                this.inbox.set(mail.id, mail);

                this.notify(
                    `ได้รับจดหมายใหม่จาก ${mail.senderName || "Unknown"}`
                );

                this.emitEvent("mail:received", mail);

            });

            this.socket.on("mail:sent", data => {

                if (data?.mail?.id) {
                    this.sent.set(data.mail.id, data.mail);
                }

                this.notify("ส่งจดหมายสำเร็จ");

            });

            this.socket.on("mail:read", data => {

                const mail = this.inbox.get(data?.mailId);

                if (mail) {
                    mail.isRead = true;
                }

            });

            this.socket.on("mail:attachment-claimed", data => {

                const mail = this.inbox.get(data?.mailId);

                if (mail) {
                    mail.attachmentsClaimed = true;
                }

                this.notify("รับสิ่งของจากจดหมายแล้ว");

            });

            this.socket.on("mail:deleted", data => {

                if (data?.mailId) {
                    this.inbox.delete(data.mailId);
                    this.sent.delete(data.mailId);
                }

                this.emitEvent("mail:updated", {
                    inbox: this.getInbox(),
                    sent: this.getSent()
                });

            });

            this.socket.on("mail:error", data => {

                this.notify(
                    data?.message || "เกิดข้อผิดพลาดในระบบจดหมาย"
                );

            });

        },

        /* =====================================
           REQUEST MAIL
        ===================================== */

        requestSync() {

            if (!this.socket?.connected) return false;

            this.socket.emit("mail:request");

            return true;

        },

        /* =====================================
           GET MAIL
        ===================================== */

        getInbox() {

            return Array.from(this.inbox.values());

        },

        getSent() {

            return Array.from(this.sent.values());

        },

        getMail(mailId) {

            return (
                this.inbox.get(mailId) ||
                this.sent.get(mailId) ||
                null
            );

        },

        getUnreadCount() {

            return this.getInbox().filter(
                mail => !mail.isRead
            ).length;

        },

        /* =====================================
           OPEN MAIL
        ===================================== */

        openMail(mailId) {

            const mail = this.inbox.get(mailId);

            if (!mail) {
                return {
                    success: false,
                    message: "ไม่พบจดหมาย"
                };
            }

            this.currentMail = mailId;

            if (!mail.isRead && this.socket?.connected) {

                this.socket.emit("mail:read", {
                    mailId
                });

            }

            return {
                success: true,
                mail
            };

        },

        /* =====================================
           SEND MAIL
        ===================================== */

        sendMail(data = {}) {

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            const receiver = String(
                data.receiver || ""
            ).trim();

            const subject = String(
                data.subject || ""
            ).trim();

            const message = String(
                data.message || ""
            ).trim();

            const attachments = Array.isArray(data.attachments)
                ? data.attachments
                : [];

            if (!receiver) {
                return {
                    success: false,
                    message: "กรุณาระบุผู้รับ"
                };
            }

            if (!subject) {
                return {
                    success: false,
                    message: "กรุณาระบุหัวข้อจดหมาย"
                };
            }

            if (!message) {
                return {
                    success: false,
                    message: "กรุณาเขียนข้อความ"
                };
            }

            if (subject.length > this.MAX_SUBJECT_LENGTH) {
                return {
                    success: false,
                    message: "หัวข้อยาวเกินไป"
                };
            }

            if (message.length > this.MAX_MESSAGE_LENGTH) {
                return {
                    success: false,
                    message: "ข้อความยาวเกินไป"
                };
            }

            if (attachments.length > this.MAX_ATTACHMENTS) {
                return {
                    success: false,
                    message: "แนบไอเทมได้ไม่เกิน 5 ชิ้น"
                };
            }

            this.socket.emit("mail:send", {
                receiver,
                subject,
                message,
                attachments
            });

            return {
                success: true,
                message: "ส่งคำขอส่งจดหมายแล้ว"
            };

        },

        /* =====================================
           CLAIM ATTACHMENTS
        ===================================== */

        claimAttachments(mailId) {

            const mail = this.inbox.get(mailId);

            if (!mail) {
                return {
                    success: false,
                    message: "ไม่พบจดหมาย"
                };
            }

            if (mail.attachmentsClaimed) {
                return {
                    success: false,
                    message: "รับสิ่งของไปแล้ว"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("mail:claim-attachments", {
                mailId
            });

            return {
                success: true,
                message: "ส่งคำขอรับสิ่งของแล้ว"
            };

        },

        /* =====================================
           DELETE MAIL
        ===================================== */

        deleteMail(mailId) {

            if (!this.socket?.connected) return false;

            this.socket.emit("mail:delete", {
                mailId
            });

            return true;

        },

        /* =====================================
           DELETE ALL READ MAIL
        ===================================== */

        deleteReadMail() {

            if (!this.socket?.connected) return false;

            this.socket.emit("mail:delete-read");

            return true;

        },

        /* =====================================
           MAIL STATUS
        ===================================== */

        hasAttachments(mailId) {

            const mail = this.getMail(mailId);

            return Boolean(
                mail &&
                Array.isArray(mail.attachments) &&
                mail.attachments.length > 0
            );

        },

        hasUnclaimedAttachments(mailId) {

            const mail = this.inbox.get(mailId);

            return Boolean(
                mail &&
                this.hasAttachments(mailId) &&
                !mail.attachmentsClaimed
            );

        },

        /* =====================================
           SYSTEM MAIL
        ===================================== */

        getSystemMail() {

            return this.getInbox().filter(
                mail => mail.senderType === "system"
            );

        },

        /* =====================================
           NOTIFICATIONS
        ===================================== */

        notify(message) {

            console.log("[MailSystem]", message);

            window.dispatchEvent(
                new CustomEvent("mail:notification", {
                    detail: { message }
                })
            );

        },

        emitEvent(eventName, detail) {

            window.dispatchEvent(
                new CustomEvent(eventName, {
                    detail
                })
            );

        },

        /* =====================================
           SOCKET CONTROL
        ===================================== */

        setSocket(socket) {

            this.socket = socket;

            this.bindSocketEvents();

        },

        /* =====================================
           DESTROY
        ===================================== */

        destroy() {

            if (this.socket) {

                [
                    "mail:sync",
                    "mail:received",
                    "mail:sent",
                    "mail:read",
                    "mail:attachment-claimed",
                    "mail:deleted",
                    "mail:error"
                ].forEach(event => {
                    this.socket.off(event);
                });

            }

            this.inbox.clear();
            this.sent.clear();

            this.currentMail = null;
            this.socket = null;
            this.initialized = false;

            console.log("[MailSystem] Destroyed");

        }

    };

    window.MailSystem = MailSystem;

})();
