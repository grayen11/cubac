// anticheat_module.ts
// Oyuncu raporlama ve anti-hile sistemi

let reportPlayerRpc: nkruntime.RpcFunction;
let getReportStatusRpc: nkruntime.RpcFunction;

reportPlayerRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let reportedUserId = request.reported_user_id;
    let reason = request.reason;

    if (!reportedUserId || !reason) {
        return JSON.stringify({ success: false, error: "Missing required fields." });
    }

    logger.info("Report filed: %s reported %s for %s", ctx.userId, reportedUserId, reason);

    nk.storageWrite([{
        collection: StorageCollections.REPORT_LOGS,
        key: StorageKeys.REPORT + "_" + Date.now().toString(),
        userId: ctx.userId!,
        value: {
            reporter_id: ctx.userId,
            reported_user_id: reportedUserId,
            reason: reason,
            created_at: Date.now(),
            status: "pending",
        },
        permissionRead: 0,
        permissionWrite: 0,
    }]);

    return JSON.stringify({ success: true, message: "Report submitted." });
};

getReportStatusRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    return JSON.stringify({ success: true, reports: [] });
};

let adminBanPlayerRpc: nkruntime.RpcFunction;
let adminUnbanPlayerRpc: nkruntime.RpcFunction;

adminBanPlayerRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let targetUserId = request.user_id;
    let reason = request.reason || "Admin ban";

    if (!targetUserId) {
        return JSON.stringify({ success: false, error: "Missing user_id." });
    }

    try {
        nk.usersBanId([targetUserId]);
        nk.storageWrite([{
            collection: StorageCollections.ANTICHEAT_FLAGS,
            key: StorageKeys.REPORT,
            userId: targetUserId,
            value: { banned: true, reason: reason, banned_at: Date.now() },
            permissionRead: 0,
            permissionWrite: 0,
        }]);
        logger.info("Banned user %s: %s", targetUserId, reason);
        return JSON.stringify({ success: true, message: "Player banned." });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to ban player." });
    }
};

adminUnbanPlayerRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let targetUserId = request.user_id;

    if (!targetUserId) {
        return JSON.stringify({ success: false, error: "Missing user_id." });
    }

    try {
        nk.usersUnbanId([targetUserId]);
        logger.info("Unbanned user %s", targetUserId);
        return JSON.stringify({ success: true, message: "Player unbanned." });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to unban player." });
    }
};