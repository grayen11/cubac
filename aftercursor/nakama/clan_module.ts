// clan_module.ts
// Klan sistemi - Nakama Groups API kullanılarak

let clanCreateRpc: nkruntime.RpcFunction;
let clanJoinRpc: nkruntime.RpcFunction;
let clanLeaveRpc: nkruntime.RpcFunction;
let clanListRpc: nkruntime.RpcFunction;
let clanInfoRpc: nkruntime.RpcFunction;
let clanKickRpc: nkruntime.RpcFunction;
let clanPromoteRpc: nkruntime.RpcFunction;
let clanSearchRpc: nkruntime.RpcFunction;
let clanStartTeamMatchRpc: nkruntime.RpcFunction;
let beforeGetAccountHook: nkruntime.BeforeGetAccountFunction;

clanCreateRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanName = request.name;

    if (!clanName || clanName.length < 3) {
        return JSON.stringify({ success: false, error: "Clan name too short." });
    }

    try {
        let group = nk.groupCreate(ctx.userId, clanName, ctx.userId, 'en', "", "", true, {
            owner_id: ctx.userId,
        }, 50);

        logger.info("Clan created: %s by user %s", group.id, ctx.userId);
        return JSON.stringify({
            success: true,
            clan_id: group.id,
            name: group.name,
        });
    } catch (e) {
        logger.error("Failed to create clan: %s", e);
        return JSON.stringify({ success: false, error: "Failed to create clan." });
    }
};

clanJoinRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanId = request.clan_id;

    try {
        nk.groupUserJoin(clanId, ctx.userId!, ctx.username || "");
        logger.info("User %s joined clan %s", ctx.userId, clanId);
        return JSON.stringify({ success: true, message: "Joined clan successfully." });
    } catch (e) {
        logger.error("Failed to join clan: %s", e);
        return JSON.stringify({ success: false, error: "Failed to join clan." });
    }
};

clanLeaveRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanId = request.clan_id;

    try {
        nk.groupUserLeave(clanId, ctx.userId!, ctx.username || "");
        return JSON.stringify({ success: true, message: "Left clan successfully." });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to leave clan." });
    }
};

clanListRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    try {
        let result = nk.userGroupsList(ctx.userId!, 100);
        let clans = (result.userGroups || []).map(function(entry) {
            return {
                id: entry.group!.id,
                name: entry.group!.name,
                member_count: entry.group!.edgeCount,
            };
        });
        return JSON.stringify({ success: true, clans: clans });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to list clans.", clans: [] });
    }
};

clanInfoRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanId = request.clan_id;

    try {
        let groups = nk.groupsGetId([clanId]);
        if (!groups || groups.length === 0) {
            return JSON.stringify({ success: false, error: "Clan not found." });
        }
        let group = groups[0];
        let memberList = nk.groupUsersList(clanId, 100);
        return JSON.stringify({
            success: true,
            clan: {
                id: group.id,
                name: group.name,
                description: group.description,
                member_count: group.edgeCount,
                members: (memberList.groupUsers || []).map(function(m) {
                    return { user_id: m.user!.id, username: m.user!.username, role: m.state };
                }),
            },
        });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to get clan info." });
    }
};

clanKickRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanId = request.clan_id;
    let targetUserId = request.user_id;

    try {
        nk.groupUsersKick(clanId, [targetUserId], ctx.userId!);
        return JSON.stringify({ success: true, message: "Player kicked." });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to kick player." });
    }
};

clanPromoteRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clanId = request.clan_id;
    let targetUserId = request.user_id;

    try {
        nk.groupUsersPromote(clanId, [targetUserId], ctx.userId!);
        return JSON.stringify({ success: true, message: "Player promoted." });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Failed to promote player." });
    }
};

clanSearchRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let query = request.query || "";

    try {
        let results = nk.groupsList(query, null, null, null, 20);
        let clans = (results.groups || []).map(function(g) {
            return { id: g.id, name: g.name, member_count: g.edgeCount };
        });
        return JSON.stringify({ success: true, clans: clans });
    } catch (e) {
        return JSON.stringify({ success: false, error: "Search failed.", clans: [] });
    }
};

clanStartTeamMatchRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let mapId = request.map_id || "random";

    return JSON.stringify({
        success: true,
        use_socket: true,
        min_count: 2,
        max_count: 6,
        query: "*",
        string_properties: { map_id: mapId, clan_match: "true" },
        numeric_properties: { team_size: 3 },
        message: "Use socket matchmaker to start clan match.",
    });
};

beforeGetAccountHook = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.GetAccountRequest): nkruntime.GetAccountRequest | undefined {
    return data;
};