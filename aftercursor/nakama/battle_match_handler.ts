// battle_match_handler.ts
// Savaş'ın ana state machine'i

let matchInit: nkruntime.MatchInitFunction;
let matchJoin: nkruntime.MatchJoinFunction;
let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction;
let matchLeave: nkruntime.MatchLeaveFunction;
let matchLoop: nkruntime.MatchLoopFunction;
let matchTerminate: nkruntime.MatchTerminateFunction;
let matchSignal: nkruntime.MatchSignalFunction;

matchInit = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: any }): { state: { [key: string]: any }, tickRate: number, label: string } {
    logger.info("Match init with params: %s", JSON.stringify(params));

    let mapId = params.map_id || "map_random";
    let gameMode = params.game_mode || "kill_based";
    let teamSize = params.team_size || 3;
    let matchDuration = params.match_duration_sec || 180;

    let mapRules = getMapRules(mapId);
    if (mapRules) {
        gameMode = mapRules.game_mode;
        teamSize = mapRules.team_size;
        matchDuration = mapRules.match_duration_sec;
        if (mapId === "random" || mapId === "map_random") {
            mapId = mapRules.map_id;
        }
    }

    let initialState: any = {
        match_id: ctx.matchId,
        map_id: mapId,
        game_mode: gameMode,
        team_size: teamSize,
        match_duration_sec: matchDuration,
        start_time: Date.now(),
        end_time: Date.now() + matchDuration * 1000,
        teams: {},
        items: [],
        scores: {},
        winner_team: -1,
        match_ended: false,
    };

    let teams = params.teams || [[], []];
    for (let i = 0; i < teams.length; i++) {
        initialState.teams[i] = [];
        initialState.scores[i] = 0;
        for (let playerData of teams[i]) {
            let player = createPlayerState(playerData, i, mapRules);
            initialState.teams[i].push(player);
        }
    }

    return {
        state: initialState,
        tickRate: 20,
        label: "Clans Online Battle - " + mapId,
    };
};

matchJoin = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, presences: nkruntime.Presence[]): { state: { [key: string]: any } } {
    logger.info("Players joined: %d", presences.length);

    for (let presence of presences) {
        for (let teamIndex in state.teams) {
            let team = state.teams[teamIndex];
            for (let player of team) {
                if (player.user_id === presence.userId) {
                    player.disconnected = false;
                    logger.info("Player %s reconnected to match", presence.username);
                }
            }
        }
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
        type: "players_joined",
        count: presences.length,
    }));

    return { state: state };
};

matchJoinAttempt = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, presence: nkruntime.Presence, metadata: { [key: string]: any }): { state: { [key: string]: any }, accept: boolean, rejectReason?: string } {
    for (let team of Object.values(state.teams)) {
        for (let player of team as any[]) {
            if (player.user_id === presence.userId) {
                return { state: state, accept: true };
            }
        }
    }

    return { state: state, accept: false, rejectReason: "Not part of this match." };
};

matchLeave = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, presences: nkruntime.Presence[]): { state: { [key: string]: any } } {
    for (let presence of presences) {
        logger.info("Player %s disconnected from match", presence.username);

        for (let teamIndex in state.teams) {
            let team = state.teams[teamIndex];
            for (let player of team) {
                if (player.user_id === presence.userId) {
                    player.disconnected = true;
                    player.last_activity_time = Date.now();
                    break;
                }
            }
        }
    }

    return { state: state };
};

matchLoop = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, messages: nkruntime.MatchMessage[]): { state: { [key: string]: any } } {
    let currentTime = Date.now();

    for (let message of messages) {
        try {
            let data = JSON.parse(nk.binaryToString(message.data));
            processMatchMessage(dispatcher, state, message.sender.userId, data, currentTime, nk);
        } catch (e) {
            logger.warn("Failed to parse match message: %s", e);
        }
    }

    updateMatchState(state, currentTime, dispatcher);
    handleItemDespawns(state, currentTime, dispatcher);
    handleItemSpawning(state, currentTime, dispatcher, nk);

    if (!state.match_ended) {
        checkMatchEnd(state, currentTime, dispatcher, logger);
    }

    handleAfkPlayers(state, currentTime, dispatcher, logger);

    if (tick % 10 === 0) {
        sendStateUpdate(dispatcher, state);
    }

    return { state: state };
};

matchTerminate = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, graceSeconds: number): { state: { [key: string]: any } } {
    logger.info("Match terminating: %s", state.match_id);

    if (!state.match_ended) {
        determineWinner(state, logger);
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
        type: "match_terminated",
        results: getMatchResults(state),
    }));

    distributeRewards(state, nk, logger);

    return { state: state };
};

matchSignal = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: { [key: string]: any }, signal: string): { state: { [key: string]: any } } {
    logger.info("Match signal received: %s", signal);
    return { state: state };
};

function createPlayerState(playerData: any, teamIndex: number, mapRules: any): any {
    let baseStats = getCharacterBaseStatsById(playerData.character_id || "char_warrior");
    let health = baseStats ? baseStats.base_health : 5000;
    let spawnPoint = { x: 0, y: 0 };

    if (mapRules && mapRules.spawn_points && mapRules.spawn_points[teamIndex]) {
        let teamSpawns = mapRules.spawn_points[teamIndex];
        spawnPoint = teamSpawns[Math.floor(Math.random() * teamSpawns.length)];
    }

    return {
        user_id: playerData.user_id,
        username: playerData.username || "Player",
        character_id: playerData.character_id || "char_warrior",
        team_index: teamIndex,
        health: health,
        max_health: health,
        damage: baseStats ? baseStats.base_damage : 800,
        speed: baseStats ? baseStats.base_speed : 300,
        position_x: spawnPoint.x,
        position_y: spawnPoint.y,
        rotation: 0,
        alive: true,
        respawn_timer: 0,
        kills: 0,
        deaths: 0,
        score: 0,
        last_activity_time: Date.now(),
        is_afk: false,
        is_bot: playerData.is_bot || false,
        disconnected: false,
        level: 0,
        buffs: { health_buff: 0, damage_buff: 0, speed_buff: 0, health_regen_buff: 0 },
    };
}

function processMatchMessage(dispatcher: nkruntime.MatchDispatcher, matchState: any, senderId: string, data: any, currentTime: number, nk: nkruntime.Nakama): void {
    let player = findPlayerById(matchState, senderId);
    if (!player || player.is_afk) return;

    player.last_activity_time = currentTime;

    switch (data.type) {
        case "player_input":
            player.position_x = data.position_x;
            player.position_y = data.position_y;
            player.rotation = data.rotation;
            break;
        case "shoot":
            dispatcher.broadcastMessage(1, JSON.stringify({
                type: "player_shot",
                user_id: player.user_id,
                timestamp: currentTime,
            }));
            break;
        case "collect_item":
            for (let item of matchState.items) {
                if (item.item_id === data.item_id && !item.collected) {
                    collectItem(player, item, matchState, dispatcher);
                    break;
                }
            }
            break;
        case "ping":
            break;
    }
}

function updateMatchState(matchState: any, currentTime: number, dispatcher: nkruntime.MatchDispatcher): void {
    for (let team of Object.values(matchState.teams)) {
        for (let player of team as any[]) {
            if (player.alive && player.health < player.max_health) {
                let regen = 5 + (player.buffs.health_regen_buff || 0) * 2;
                player.health = Math.min(player.max_health, player.health + regen);
            }
        }
    }
}

function isPlayerAfk(player: any, currentTime: number): boolean {
    return (currentTime - player.last_activity_time) > AFK_TIMEOUT_SEC * 1000;
}

function handleAfkPlayers(matchState: any, currentTime: number, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void {
    for (let team of Object.values(matchState.teams)) {
        for (let player of team as any[]) {
            if (player.is_bot) continue;
            if (!player.is_afk && isPlayerAfk(player, currentTime)) {
                player.is_afk = true;
                logger.info("Player %s is AFK", player.username);
            }
        }
    }
}

function findPlayerById(matchState: any, userId: string): any {
    for (let team of Object.values(matchState.teams)) {
        for (let player of team as any[]) {
            if (player.user_id === userId) return player;
        }
    }
    return null;
}

function checkMatchEnd(matchState: any, currentTime: number, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void {
    if (currentTime >= matchState.end_time) {
        matchState.match_ended = true;
        determineWinner(matchState, logger);
        sendMatchEnd(dispatcher, matchState);
    }
}

function determineWinner(matchState: any, logger: nkruntime.Logger): void {
    if (matchState.winner_team >= 0) return;

    let maxScore = -1;
    let winner = 0;
    for (let teamIndex in matchState.scores) {
        if (matchState.scores[teamIndex] > maxScore) {
            maxScore = matchState.scores[teamIndex];
            winner = parseInt(teamIndex);
        }
    }
    matchState.winner_team = winner;
}

function sendMatchEnd(dispatcher: nkruntime.MatchDispatcher, matchState: any): void {
    dispatcher.broadcastMessage(1, JSON.stringify({
        type: "match_ended",
        results: getMatchResults(matchState),
    }));
}

function sendStateUpdate(dispatcher: nkruntime.MatchDispatcher, matchState: any): void {
    let update = {
        type: "state_update",
        players: [] as any[],
        scores: matchState.scores,
        items: matchState.items.filter(function(i: any) { return !i.collected; }),
    };

    for (let team of Object.values(matchState.teams)) {
        for (let player of team as any[]) {
            update.players.push({
                user_id: player.user_id,
                position_x: player.position_x,
                position_y: player.position_y,
                health: Math.round(player.health),
                alive: player.alive,
                kills: player.kills,
            });
        }
    }

    dispatcher.broadcastMessage(2, JSON.stringify(update));
}

function getCharacterBaseStatsById(characterId: string): any {
    return allCharactersCache.find(function(c) { return c.id === characterId; }) || null;
}
