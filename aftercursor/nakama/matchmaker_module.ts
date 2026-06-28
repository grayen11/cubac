// matchmaker_module.ts
// Eşleşme isteği RPC'si, matched-hook, bot doldurma

let requestMatchRpc: nkruntime.RpcFunction;
let cancelMatchRpc: nkruntime.RpcFunction;
let matchmakerMatchedHook: nkruntime.MatchmakerMatchedFunction;

requestMatchRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let characterId = request.character_id || "char_warrior";
    let mapId = request.map_id || "random";

    return JSON.stringify({
        success: true,
        use_socket: true,
        min_count: 2,
        max_count: 4,
        query: "*",
        string_properties: { character_id: characterId, map_id: mapId },
        numeric_properties: { team_size: 2 },
        message: "Use socket matchmaker to search for a match.",
    });
};

cancelMatchRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    return JSON.stringify({
        success: true,
        use_socket: true,
        message: "Use socket matchmaker remove to cancel.",
    });
};

matchmakerMatchedHook = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: nkruntime.MatchmakerResult[]): string {
    logger.info("Matchmaker matched %d groups", matches.length);

    let matchIds: string[] = [];

    for (let match of matches) {
        let teams: any[][] = [[], []];
        let mapId = "random";
        let gameMode = "kill_based";
        let teamSize = 2;
        let matchDuration = 180;

        for (let i = 0; i < match.users.length; i++) {
            let user = match.users[i];
            let props = user.stringProperties || {};
            if (props.map_id) {
                mapId = props.map_id;
            }

            let teamIndex = i % 2;
            teams[teamIndex].push({
                user_id: user.presence.userId,
                username: user.presence.username,
                character_id: props.character_id || "char_warrior",
                is_bot: false,
            });
        }

        let mapRules = getMapRules(mapId);
        if (mapRules) {
            gameMode = mapRules.game_mode;
            teamSize = mapRules.team_size;
            matchDuration = mapRules.match_duration_sec;
        }

        let matchId = nk.matchCreate("battle_match", {
            map_id: mapId,
            game_mode: gameMode,
            team_size: teamSize,
            match_duration_sec: matchDuration,
            teams: teams,
        });

        matchIds.push(matchId);
        logger.info("Created battle match: %s", matchId);
    }

    return JSON.stringify({ match_ids: matchIds });
};
