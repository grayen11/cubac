// battle_result_module.ts
// Maç sonu altın dağıtımı ve sonuç payload'ı

function getMatchResults(matchState: any): any {
    let results = {
        match_id: matchState.match_id,
        map_id: matchState.map_id,
        game_mode: matchState.game_mode,
        winner_team: matchState.winner_team,
        teams: {} as any,
        scores: matchState.scores,
        duration_sec: Math.round((Date.now() - matchState.start_time) / 1000),
    };

    for (let teamIndex in matchState.teams) {
        results.teams[teamIndex] = matchState.teams[teamIndex].map((p: any) => ({
            user_id: p.user_id,
            username: p.username,
            character_id: p.character_id,
            kills: p.kills,
            deaths: p.deaths,
            score: p.score,
            is_bot: p.is_bot,
            is_winner: parseInt(teamIndex) === matchState.winner_team,
            gold_earned: parseInt(teamIndex) === matchState.winner_team ? GOLD_WIN : GOLD_LOSS,
        }));
    }

    return results;
}

function distributeRewards(matchState: any, nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
    for (let teamIndex in matchState.teams) {
        let isWinner = parseInt(teamIndex) === matchState.winner_team;
        let goldAmount = isWinner ? GOLD_WIN : GOLD_LOSS;

        for (let player of matchState.teams[teamIndex]) {
            if (player.is_bot) continue;

            try {
                let storageObjects = nk.storageRead([{ collection: StorageCollections.USER_ECONOMY, key: StorageKeys.ECONOMY, userId: player.user_id }]);
                let economy: any;
                if (storageObjects && storageObjects.length > 0) {
                    economy = storageObjects[0].value;
                } else {
                    economy = { gold: 0, total_gold_earned: 0, total_gold_spent: 0 };
                }

                economy.gold += goldAmount;
                economy.total_gold_earned += goldAmount;
                nk.storageWrite([{ collection: StorageCollections.USER_ECONOMY, key: StorageKeys.ECONOMY, userId: player.user_id, value: economy, permissionRead: 2, permissionWrite: 0 }]);
                logger.info("Awarded %d gold to user %s (winner: %s)", goldAmount, player.user_id, isWinner);
            } catch (e) {
                logger.warn("Failed to award gold to user %s: %s", player.user_id, e);
            }
        }
    }
}