// battle_combat_module.ts
// Hasar hesaplama ve savaş mekanikleri

function calculateDamage(attacker: any, target: any): number {
    let baseDamage = attacker.damage;
    baseDamage *= (1 + attacker.buffs.damage_buff * 0.04);
    let variance = 0.9 + Math.random() * 0.2;
    return Math.round(baseDamage * variance);
}

function applyDamage(target: any, damage: number, matchState: any, dispatcher: nkruntime.MatchDispatcher, attacker: any): void {
    target.health -= damage;

    if (target.health <= 0) {
        target.health = 0;
        target.alive = false;
        target.deaths += 1;
        target.respawn_timer = 5;
        attacker.kills += 1;
        attacker.score += 100;

        matchState.scores[attacker.team_index] = (matchState.scores[attacker.team_index] || 0) + 1;

        dispatcher.broadcastMessage(1, JSON.stringify({
            type: 'player_killed',
            attacker_id: attacker.user_id,
            target_id: target.user_id,
            attacker_kills: attacker.kills,
        }));
    }
}

function validateHit(attacker: any, target: any, data: any, matchState: any): boolean {
    if (attacker.team_index === target.team_index) return false;
    if (!target.alive) return false;

    let dx = data.target_x - attacker.position_x;
    let dy = data.target_y - attacker.position_y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    let maxRange = 500;
    if (distance > maxRange) return false;

    return true;
}

function validateDamage(attacker: any, target: any, damage: number): boolean {
    let maxPossibleDamage = attacker.damage * (1 + attacker.buffs.damage_buff * 0.04) * 2;
    let minPossibleDamage = attacker.damage * 0.5;

    if (damage > maxPossibleDamage || damage < minPossibleDamage) {
        return false;
    }

    return true;
}

function validateMovement(prevState: any, newState: any, deltaTime: number, mapRules: any): boolean {
    let dx = newState.position_x - prevState.position_x;
    let dy = newState.position_y - prevState.position_y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    let maxSpeed = 500;
    let maxDistance = maxSpeed * deltaTime * 1.3;

    if (distance > maxDistance && distance > 100) {
        return false;
    }

    return true;
}