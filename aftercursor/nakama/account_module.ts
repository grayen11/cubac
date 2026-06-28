// account_module.ts
// Apple/Google/Email auth hooks, kullanıcı oluşturma, username/profil işlemleri

let beforeAuthenticateApple: nkruntime.BeforeAuthenticateAppleFunction;
let beforeAuthenticateGoogle: nkruntime.BeforeAuthenticateGoogleFunction;
let beforeAuthenticateEmail: nkruntime.BeforeAuthenticateEmailFunction;
let afterAuthenticateApple: nkruntime.AfterAuthenticateAppleFunction;
let afterAuthenticateGoogle: nkruntime.AfterAuthenticateGoogleFunction;
let afterAuthenticateEmail: nkruntime.AfterAuthenticateEmailFunction;

beforeAuthenticateApple = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateAppleRequest): nkruntime.AuthenticateAppleRequest | undefined {
    logger.info("Before Apple authenticate for token: %s", data.token?.substring(0, 10) + "...");
    return data;
};

beforeAuthenticateGoogle = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateGoogleRequest): nkruntime.AuthenticateGoogleRequest | undefined {
    logger.info("Before Google authenticate for token: %s", data.token?.substring(0, 10) + "...");
    return data;
};

beforeAuthenticateEmail = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.AuthenticateEmailRequest): nkruntime.AuthenticateEmailRequest | undefined {
    logger.info("Before Email authenticate for: %s", data.email);
    return data;
};

afterAuthenticateApple = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, request: nkruntime.AuthenticateAppleRequest) {
    logger.info("After Apple authenticate for user: %s", data.userId);
    initializeNewUser(nk, data.userId, logger);
};

afterAuthenticateGoogle = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, request: nkruntime.AuthenticateGoogleRequest) {
    logger.info("After Google authenticate for user: %s", data.userId);
    initializeNewUser(nk, data.userId, logger);
};

afterAuthenticateEmail = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, request: nkruntime.AuthenticateEmailRequest) {
    logger.info("After Email authenticate for user: %s", data.userId);
    initializeNewUser(nk, data.userId, logger);
};

let updateUsernameRpc: nkruntime.RpcFunction;
let updateProfilePictureRpc: nkruntime.RpcFunction;
let requestAccountDeletionRpc: nkruntime.RpcFunction;
let checkDeletionStatusRpc: nkruntime.RpcFunction;
let toggleEmailAuthVisibilityRpc: nkruntime.RpcFunction;

function initializeNewUser(nk: nkruntime.Nakama, userId: string, logger: nkruntime.Logger): void {
    let economyObjects = nk.storageRead([{ collection: StorageCollections.USER_ECONOMY, key: StorageKeys.ECONOMY, userId: userId }]);
    if (economyObjects && economyObjects.length > 0) {
        return;
    }

    nk.storageWrite([
        {
            collection: StorageCollections.USER_ECONOMY,
            key: StorageKeys.ECONOMY,
            userId: userId,
            value: { gold: 1000, total_gold_earned: 0, total_gold_spent: 0 },
            permissionRead: 2,
            permissionWrite: 0,
        },
        {
            collection: StorageCollections.USER_CHARACTERS,
            key: StorageKeys.CHARACTERS,
            userId: userId,
            value: { owned: ["char_warrior"], upgrades: { char_warrior: { health: 0, damage: 0, speed: 0 } } },
            permissionRead: 2,
            permissionWrite: 0,
        },
        {
            collection: StorageCollections.USER_SETTINGS,
            key: StorageKeys.SETTINGS,
            userId: userId,
            value: { music_volume: 1.0, sfx_volume: 1.0, vibration_enabled: true, language: "en" },
            permissionRead: 2,
            permissionWrite: 0,
        },
    ]);
    logger.info("Initialized storage for new user: %s", userId);
}

function getUsernameCooldown(nk: nkruntime.Nakama, userId: string): number {
    let objects = nk.storageRead([{ collection: StorageCollections.USERNAME_COOLDOWN, key: StorageKeys.USERNAME_COOLDOWN, userId: userId }]);
    if (objects && objects.length > 0) {
        return objects[0].value?.last_changed_at || 0;
    }
    return 0;
}

function setUsernameCooldown(nk: nkruntime.Nakama, userId: string): void {
    nk.storageWrite([{
        collection: StorageCollections.USERNAME_COOLDOWN,
        key: StorageKeys.USERNAME_COOLDOWN,
        userId: userId,
        value: { last_changed_at: Date.now() },
        permissionRead: 1,
        permissionWrite: 0,
    }]);
}

updateUsernameRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let newUsername = (request.username || "").trim();

    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
        return JSON.stringify({ success: false, error: "Username must be 3-20 characters." });
    }

    let lastChanged = getUsernameCooldown(nk, ctx.userId!);
    let cooldownMs = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (lastChanged > 0 && Date.now() - lastChanged < cooldownMs) {
        return JSON.stringify({ success: false, error: "Username change is on cooldown." });
    }

    try {
        nk.accountUpdateId(ctx.userId!, newUsername, null, null, null, null, null, null);
        setUsernameCooldown(nk, ctx.userId!);
        return JSON.stringify({ success: true, username: newUsername });
    } catch (e) {
        logger.error("Failed to update username: %s", e);
        return JSON.stringify({ success: false, error: "Failed to update username." });
    }
};

updateProfilePictureRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let avatarUrl = request.avatar_url || "";

    try {
        nk.accountUpdateId(ctx.userId!, null, null, avatarUrl, null, null, null, null);
        return JSON.stringify({ success: true, avatar_url: avatarUrl });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to update profile picture." });
    }
};

requestAccountDeletionRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    nk.storageWrite([{
        collection: StorageCollections.USER_DELETION,
        key: StorageKeys.DELETION_REQUEST,
        userId: ctx.userId!,
        value: { requested_at: Date.now(), status: "pending" },
        permissionRead: 1,
        permissionWrite: 0,
    }]);
    return JSON.stringify({ success: true, message: "Account deletion requested." });
};

checkDeletionStatusRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let objects = nk.storageRead([{ collection: StorageCollections.USER_DELETION, key: StorageKeys.DELETION_REQUEST, userId: ctx.userId! }]);
    if (objects && objects.length > 0) {
        return JSON.stringify({ success: true, status: objects[0].value?.status || "none" });
    }
    return JSON.stringify({ success: true, status: "none" });
};

toggleEmailAuthVisibilityRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let visible = !!request.visible;
    return JSON.stringify({ success: true, visible: visible });
};