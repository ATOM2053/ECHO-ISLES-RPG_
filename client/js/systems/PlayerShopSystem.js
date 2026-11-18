/* =========================================
   ECHO ISLES RPG
   Player Shop System
   Version: 1.0.0
========================================= */

(function () {
    "use strict";

    const PlayerShopSystem = {

        shops: new Map(),
        myShopId: null,
        socket: null,
        initialized: false,

        settings: {
            maxListings: 20,
            maxShopNameLength: 30,
            maxItemPrice: 999999999,
            minItemPrice: 1,
            maxSearchResults: 50
        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init(socket) {

            this.socket = socket || null;
            this.bindSocketEvents();

            this.initialized = true;

            console.log("[PlayerShopSystem] Initialized");

            return true;
        },

        setSocket(socket) {

            this.socket = socket || null;
            this.bindSocketEvents();

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            const events = [
                "shop:created",
                "shop:updated",
                "shop:closed",
                "shop:opened",
                "shop:listing-added",
                "shop:listing-removed",
                "shop:purchased",
                "shop:search-results",
                "shop:my-shop",
                "shop:error"
            ];

            events.forEach(event => {
                this.socket.off(event);
            });

            this.socket.on("shop:created", data => {

                if (!data || !data.shop) return;

                this.shops.set(data.shop.id, data.shop);
                this.myShopId = data.shop.id;

                this.emitEvent("created", data.shop);

            });

            this.socket.on("shop:updated", shop => {

                if (!shop || !shop.id) return;

                this.shops.set(shop.id, shop);

                this.emitEvent("updated", shop);

            });

            this.socket.on("shop:closed", data => {

                if (!data || !data.shopId) return;

                this.shops.delete(data.shopId);

                if (this.myShopId === data.shopId) {
                    this.myShopId = null;
                }

                this.emitEvent("closed", data);

            });

            this.socket.on("shop:opened", shop => {

                if (!shop || !shop.id) return;

                this.shops.set(shop.id, shop);

                this.emitEvent("opened", shop);

            });

            this.socket.on("shop:listing-added", data => {

                this.emitEvent("listing-added", data);

            });

            this.socket.on("shop:listing-removed", data => {

                this.emitEvent("listing-removed", data);

            });

            this.socket.on("shop:purchased", data => {

                this.emitEvent("purchased", data);

            });

            this.socket.on("shop:search-results", data => {

                this.emitEvent("search-results", data);

            });

            this.socket.on("shop:my-shop", shop => {

                if (!shop) return;

                this.shops.set(shop.id, shop);
                this.myShopId = shop.id;

                this.emitEvent("my-shop", shop);

            });

            this.socket.on("shop:error", error => {

                this.emitEvent("error", error);

                console.error(
                    "[PlayerShopSystem] Server error:",
                    error
                );

            });

        },

        /* =====================================
           CREATE SHOP
        ===================================== */

        createShop(name, description = "") {

            const cleanName = String(name || "").trim();

            if (!cleanName) {
                return this.fail("กรุณากรอกชื่อร้าน");
            }

            if (
                cleanName.length >
                this.settings.maxShopNameLength
            ) {
                return this.fail("ชื่อร้านยาวเกินไป");
            }

            if (this.myShopId) {
                return this.fail("คุณมีร้านค้าอยู่แล้ว");
            }

            const payload = {
                name: cleanName,
                description: String(description).trim().slice(0, 200)
            };

            return this.send("shop:create", payload);

        },

        /* =====================================
           REQUEST MY SHOP
        ===================================== */

        requestMyShop() {

            return this.send("shop:request-my-shop");

        },

        /* =====================================
           OPEN SHOP
        ===================================== */

        openShop(shopId = this.myShopId) {

            if (!shopId) {
                return this.fail("ไม่พบร้านค้าของคุณ");
            }

            return this.send("shop:open", {
                shopId
            });

        },

        /* =====================================
           CLOSE SHOP
        ===================================== */

        closeShop(shopId = this.myShopId) {

            if (!shopId) {
                return this.fail("ไม่พบร้านค้า");
            }

            return this.send("shop:close", {
                shopId
            });

        },

        /* =====================================
           UPDATE SHOP INFORMATION
        ===================================== */

        updateShop(data = {}) {

            if (!this.myShopId) {
                return this.fail("คุณยังไม่มีร้านค้า");
            }

            const payload = {};

            if (data.name !== undefined) {

                const name = String(data.name).trim();

                if (
                    !name ||
                    name.length >
                    this.settings.maxShopNameLength
                ) {
                    return this.fail("ชื่อร้านไม่ถูกต้อง");
                }

                payload.name = name;

            }

            if (data.description !== undefined) {
                payload.description =
                    String(data.description).slice(0, 200);
            }

            if (Object.keys(payload).length === 0) {
                return this.fail("ไม่มีข้อมูลที่ต้องแก้ไข");
            }

            payload.shopId = this.myShopId;

            return this.send("shop:update", payload);

        },

        /* =====================================
           ADD ITEM TO SHOP
        ===================================== */

        addListing(itemId, quantity, price) {

            if (!this.myShopId) {
                return this.fail("คุณยังไม่มีร้านค้า");
            }

            const itemQuantity = Number(quantity);
            const itemPrice = Number(price);

            if (!itemId) {
                return this.fail("ไม่พบไอเทม");
            }

            if (
                !Number.isInteger(itemQuantity) ||
                itemQuantity <= 0
            ) {
                return this.fail("จำนวนสินค้าไม่ถูกต้อง");
            }

            if (
                !Number.isInteger(itemPrice) ||
                itemPrice < this.settings.minItemPrice ||
                itemPrice > this.settings.maxItemPrice
            ) {
                return this.fail("ราคาสินค้าไม่ถูกต้อง");
            }

            return this.send("shop:add-listing", {
                shopId: this.myShopId,
                itemId,
                quantity: itemQuantity,
                price: itemPrice
            });

        },

        /* =====================================
           REMOVE LISTING
        ===================================== */

        removeListing(listingId) {

            if (!this.myShopId) {
                return this.fail("ไม่พบร้านค้าของคุณ");
            }

            if (!listingId) {
                return this.fail("ไม่พบรายการสินค้า");
            }

            return this.send("shop:remove-listing", {
                shopId: this.myShopId,
                listingId
            });

        },

        /* =====================================
           BUY ITEM
        ===================================== */

        buyItem(shopId, listingId, quantity = 1) {

            const amount = Number(quantity);

            if (!shopId || !listingId) {
                return this.fail("ข้อมูลการซื้อไม่ถูกต้อง");
            }

            if (
                !Number.isInteger(amount) ||
                amount <= 0
            ) {
                return this.fail("จำนวนสินค้าไม่ถูกต้อง");
            }

            return this.send("shop:buy", {
                shopId,
                listingId,
                quantity: amount
            });

        },

        /* =====================================
           SEARCH SHOPS
        ===================================== */

        searchShops(keyword = "", category = "all") {

            return this.send("shop:search", {

                keyword: String(keyword).trim().slice(0, 50),

                category: String(category).slice(0, 30),

                limit: this.settings.maxSearchResults

            });

        },

        /* =====================================
           VISIT SHOP
        ===================================== */

        visitShop(shopId) {

            if (!shopId) {
                return this.fail("ไม่พบร้านค้า");
            }

            return this.send("shop:visit", {
                shopId
            });

        },

        /* =====================================
           GET SHOP
        ===================================== */

        getShop(shopId) {

            return this.shops.get(shopId) || null;

        },

        getMyShop() {

            if (!this.myShopId) return null;

            return this.getShop(this.myShopId);

        },

        getAllShops() {

            return Array.from(this.shops.values());

        },

        /* =====================================
           LOCAL EVENT SYSTEM
        ===================================== */

        emitEvent(name, detail) {

            window.dispatchEvent(
                new CustomEvent("player-shop:" + name, {
                    detail
                })
            );

        },

        /* =====================================
           SOCKET EMIT
        ===================================== */

        send(event, data = {}) {

            if (!this.socket || !this.socket.connected) {
                return this.fail("ไม่ได้เชื่อมต่อเซิร์ฟเวอร์");
            }

            this.socket.emit(event, data);

            return true;

        },

        /* =====================================
           ERROR
        ===================================== */

        fail(message) {

            console.warn("[PlayerShopSystem]", message);

            this.emitEvent("error", {
                message
            });

            return false;

        },

        /* =====================================
           RESET
        ===================================== */

        reset() {

            this.shops.clear();
            this.myShopId = null;

        },

        /* =====================================
           DESTROY
        ===================================== */

        destroy() {

            if (this.socket) {

                const events = [
                    "shop:created",
                    "shop:updated",
                    "shop:closed",
                    "shop:opened",
                    "shop:listing-added",
                    "shop:listing-removed",
                    "shop:purchased",
                    "shop:search-results",
                    "shop:my-shop",
                    "shop:error"
                ];

                events.forEach(event => {
                    this.socket.off(event);
                });

            }

            this.socket = null;
            this.reset();
            this.initialized = false;

        }

    };

    window.PlayerShopSystem = PlayerShopSystem;

})();
