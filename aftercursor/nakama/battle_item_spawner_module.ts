// battle_item_spawner_module.ts
// Item spawn/despawn ve buff sistemi

function handleItemDespawns(matchState: any, currentTime: number, dispatcher: nkruntime.MatchDispatcher): void {
    let despawnedItems: string[] = [];
    matchState.items = matchState.items.filter((item: any) => {
        if (!item.collected && currentTime > item.despawn_time) {
            despawnedItems.push(item.item_id);
            return false;
        }
        return true;
    });

    if (despawnedItems.length > 0) {
        dispatcher.broadcastMessage(1, JSON.stringify({
            type: 'items_despawned',
            item_ids: despawnedItems,
        }));
    }
}

function handleItemSpawning(matchState: any, currentTime: number, dispatcher: nkruntime.MatchDispatcher, nk: nkruntime.Nakama): void {
    let mapRules = getMapRules(matchState.map_id);
    if (!mapRules) return;

    let maxItems = 5;
    let currentItemCount = matchState.items.filter((i: any) => !i.collected).length;

    if (currentItemCount < maxItems && Math.random() < 0.02) {
        let spawnZone = mapRules.item_spawn_zones[Math.floor(Math.random() * mapRules.item_spawn_zones.length)];
        let itemTypes: string[] = ['health', 'damage', 'speed', 'health_regen'];
        let itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

        let newItem: any = {
            item_id: nk.uuidV4(),
            item_type: itemType,
            position_x: spawnZone.x + (Math.random() - 0.5) * spawnZone.radius * 2,
            position_y: spawnZone.y + (Math.random() - 0.5) * spawnZone.radius * 2,
            spawn_time: currentTime,
            despawn_time: currentTime + ITEM_DESPAWN_SEC * 1000,
            collected: false,
        };

        matchState.items.push(newItem);

        dispatcher.broadcastMessage(1, JSON.stringify({
            type: 'item_spawned',
            item: newItem,
        }));
    }
}

function collectItem(player: any, item: any, matchState: any, dispatcher: nkruntime.MatchDispatcher): void {
    item.collected = true;

    switch (item.item_type) {
        case 'health':
            player.buffs.health_buff += 1;
            player.health = Math.min(player.health + 100, player.max_health);
            break;
        case 'damage':
            player.buffs.damage_buff += 1;
            break;
        case 'speed':
            player.buffs.speed_buff += 1;
            break;
        case 'health_regen':
            player.buffs.health_regen_buff += 1;
            break;
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
        type: 'item_collected',
        item_id: item.item_id,
        item_type: item.item_type,
        user_id: player.user_id,
    }));
}