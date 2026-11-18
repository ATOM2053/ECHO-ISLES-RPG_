(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let listings = [];
    let myListings = [];
    let purchaseHistory = [];

    const callbacks = {
        onListingsUpdated: null,
        onListingCreated: null,
        onListingRemoved: null,
        onPurchaseCompleted: null,
        onHistoryUpdated: null,
        onError: null
    };

    const CONFIG = {
        MAX_PRICE: 999999999,
        MAX_QUANTITY: 9999,
        MAX_SEARCH_LENGTH: 60,
        PAGE_SIZE: 20
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

    function validPrice(price) {
        return Number.isSafeInteger(price) &&
            price > 0 &&
            price <= CONFIG.MAX_PRICE;
    }

    function validQuantity(quantity) {
        return Number.isInteger(quantity) &&
            quantity > 0 &&
            quantity <= CONFIG.MAX_QUANTITY;
    }

    function normalizeListing(data) {
        if (!data || !data.id || !data.itemId) {
            return null;
        }

        return {
            id: String(data.id),
            itemId: String(data.itemId),
            itemName: String(data.itemName || "Unknown Item"),
            quantity: Number(data.quantity) || 1,
            price: Number(data.price) || 0,
            sellerId: String(data.sellerId || ""),
            sellerName: String(data.sellerName || "Unknown"),
            rarity: String(data.rarity || "common"),
            category: String(data.category || "misc"),
            createdAt: Number(data.createdAt) || Date.now(),
            expiresAt: Number(data.expiresAt) || null
        };
    }

    function setListings(data) {
        listings = Array.isArray(data)
            ? data.map(normalizeListing).filter(Boolean)
            : [];

        notify("onListingsUpdated", getListings());
    }

    function getListings() {
        return listings.map(item => ({ ...item }));
    }

    function getMyListings() {
        return myListings.map(item => ({ ...item }));
    }

    function getPurchaseHistory() {
        return purchaseHistory.map(item => ({ ...item }));
    }

    function getListing(listingId) {
        return listings.find(item =>
            item.id === String(listingId)
        ) || null;
    }

    function createListing(itemId, quantity, price) {
        if (!itemId || typeof itemId !== "string") {
            return {
                success: false,
                message: "รหัสไอเทมไม่ถูกต้อง"
            };
        }

        if (!validQuantity(quantity)) {
            return {
                success: false,
                message: "จำนวนไอเทมไม่ถูกต้อง"
            };
        }

        if (!validPrice(price)) {
            return {
                success: false,
                message: "ราคาขายไม่ถูกต้อง"
            };
        }

        const sent = emit("auction:create", {
            itemId,
            quantity,
            price
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอลงขายแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function buyListing(listingId, quantity = 1) {
        const listing = getListing(listingId);

        if (!listing) {
            return {
                success: false,
                message: "ไม่พบรายการขาย"
            };
        }

        if (!validQuantity(quantity) || quantity > listing.quantity) {
            return {
                success: false,
                message: "จำนวนที่ซื้อมากกว่าจำนวนที่มีขาย"
            };
        }

        const sent = emit("auction:buy", {
            listingId: listing.id,
            quantity
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอซื้อแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function cancelListing(listingId) {
        const id = String(listingId || "");

        if (!id) return false;

        return emit("auction:cancel", {
            listingId: id
        });
    }

    function searchListings(options = {}) {
        const filters = {
            keyword: String(options.keyword || "")
                .trim()
                .slice(0, CONFIG.MAX_SEARCH_LENGTH),

            category: options.category || "all",
            rarity: options.rarity || "all",

            minPrice: Number.isFinite(options.minPrice)
                ? Math.max(0, options.minPrice)
                : 0,

            maxPrice: Number.isFinite(options.maxPrice)
                ? Math.min(CONFIG.MAX_PRICE, options.maxPrice)
                : CONFIG.MAX_PRICE,

            sort: options.sort || "newest",

            page: Number.isInteger(options.page)
                ? Math.max(1, options.page)
                : 1
        };

        const sent = emit("auction:search", filters);

        return {
            success: sent,
            filters
        };
    }

    function requestMyListings() {
        return emit("auction:my-listings");
    }

    function requestPurchaseHistory() {
        return emit("auction:history");
    }

    function handleListings(data) {
        setListings(data?.listings || []);
    }

    function handleMyListings(data) {
        myListings = Array.isArray(data?.listings)
            ? data.listings.map(normalizeListing).filter(Boolean)
            : [];

        notify("onListingsUpdated", getMyListings());
    }

    function handleListingCreated(data) {
        const listing = normalizeListing(data?.listing);

        if (!listing) return;

        myListings.push(listing);

        notify("onListingCreated", listing);
    }

    function handleListingRemoved(data) {
        const id = String(data?.listingId || "");

        listings = listings.filter(item => item.id !== id);
        myListings = myListings.filter(item => item.id !== id);

        notify("onListingRemoved", { listingId: id });
    }

    function handlePurchaseCompleted(data) {
        if (!data) return;

        purchaseHistory.unshift(data);

        if (purchaseHistory.length > 100) {
            purchaseHistory.length = 100;
        }

        notify("onPurchaseCompleted", data);
        notify("onHistoryUpdated", getPurchaseHistory());
    }

    function handleHistory(data) {
        purchaseHistory = Array.isArray(data?.history)
            ? data.history
            : [];

        notify("onHistoryUpdated", getPurchaseHistory());
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
        socket.on("auction:listings", handleListings);
        socket.on("auction:my-listings", handleMyListings);
        socket.on("auction:created", handleListingCreated);
        socket.on("auction:removed", handleListingRemoved);
        socket.on("auction:purchased", handlePurchaseCompleted);
        socket.on("auction:history", handleHistory);
        socket.on("auction:error", handleError);
    }

    function removeSocketEvents() {
        if (!socket) return;

        socket.off("auction:listings", handleListings);
        socket.off("auction:my-listings", handleMyListings);
        socket.off("auction:created", handleListingCreated);
        socket.off("auction:removed", handleListingRemoved);
        socket.off("auction:purchased", handlePurchaseCompleted);
        socket.off("auction:history", handleHistory);
        socket.off("auction:error", handleError);
    }

    function init(newSocket) {
        if (!newSocket) {
            console.error("[AuctionSystem] Socket is required.");
            return false;
        }

        if (initialized) {
            removeSocketEvents();
        }

        socket = newSocket;

        bindSocketEvents();

        initialized = true;

       
