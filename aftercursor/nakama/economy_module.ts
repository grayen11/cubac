// economy_module.ts
// Altın bakiyesi, karakter unlock/upgrade işlemleri

let allCharactersCache: any[] = [
    {
        id: "char_warrior",
        name: "Warrior",
        base_health: 5000,
        base_damage: 800,
        base_speed: 300,
        base_ulti_power: 2000,
        base_health_regen: 50,
        unlock_type: 'default',
        unlock_cost_gold: 0,
        unlock_cost_iap: '',
        iap_price_display: '',
        costumes: [
            { id: 'default', name: 'Default', iap_product_id: '', price_display: '', thumbnail: 'costume_warrior_default' },
        ]
    },
    {
        id: "char_archer",
        name: "Archer",
        base_health: 3500,
        base_damage: 1200,
        base_speed: 350,
        base_ulti_power: 2500,
        base_health_regen: 30,
        unlock_type: 'gold',
        unlock_cost_gold: 5000,
    },
    {
        id: "char_mage",
        name: "Mage",
        base_health: 3000,
        base_damage: 1500,
        base_speed: 280,
        base_ulti_power: 3500,
        base_health_regen: 40,
        unlock_type: 'iap',
        unlock_cost_gold: 0,
        unlock_cost_iap: 'com.clansonline.character.mage',
        iap_price_display: '$2.99',
    },
];

let calculateStatValue = function(baseValue: number, level: number): number {
    return Math.round(baseValue * Math.pow(1.04, level));
};

let calculateUpgradeCost = function(currentLevel: number): number {
    return currentLevel * 500 + 500;
};

let getEconomyRpc: nkruntime.RpcFunction;
let getCharacterStatsRpc: nkruntime.RpcFunction;
let unlockCharacterRpc: nkruntime.RpcFunction;
let upgradeCharacterStatRpc: nkruntime.RpcFunction;
let getAllCharactersBaseStatsRpc: nkruntime.RpcFunction;

function getUserEconomyData(nk: nkruntime.Nakama, userId: string): any {
    let storageObjects = nk.storageRead([{ collection: StorageCollections.USER_ECONOMY, key: StorageKeys.ECONOMY, userId: userId }]);
    if (storageObjects && storageObjects.length > 0) {
        return storageObjects[0].value;
    }
    return { gold: 0, total_gold_earned: 0, total_gold_spent: 0 };
}

function getUserCharactersData(nk: nkruntime.Nakama, userId: string): any {
    let storageObjects = nk.storageRead([{ collection: StorageCollections.USER_CHARACTERS, key: StorageKeys.CHARACTERS, userId: userId }]);
    if (storageObjects && storageObjects.length > 0) {
        return storageObjects[0].value;
    }
    return { owned: ["char_warrior"], upgrades: { char_warrior: { health: 0, damage: 0, speed: 0 } } };
}

function saveUserEconomy(nk: nkruntime.Nakama, userId: string, economy: any): void {
    nk.storageWrite([{ collection: StorageCollections.USER_ECONOMY, key: StorageKeys.ECONOMY, userId: userId, value: economy, permissionRead: 2, permissionWrite: 0 }]);
}

function saveUserCharacters(nk: nkruntime.Nakama, userId: string, characters: any): void {
    nk.storageWrite([{ collection: StorageCollections.USER_CHARACTERS, key: StorageKeys.CHARACTERS, userId: userId, value: characters, permissionRead: 2, permissionWrite: 0 }]);
}

getEconomyRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let economy = getUserEconomyData(nk, ctx.userId!);
    return JSON.stringify({ success: true, economy: economy });
};

getAllCharactersBaseStatsRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let userCharacters = getUserCharactersData(nk, ctx.userId!);
    let characters = allCharactersCache.map(function(char) {
        return {
            id: char.id,
            name: char.name,
            base_health: char.base_health,
            base_damage: char.base_damage,
            base_speed: char.base_speed,
            unlock_type: char.unlock_type,
            unlock_cost_gold: char.unlock_cost_gold || 0,
            owned: userCharacters.owned.indexOf(char.id) >= 0,
        };
    });
    return JSON.stringify({ success: true, characters: characters });
};

getCharacterStatsRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let characterId = request.character_id || "char_warrior";
    let baseChar = allCharactersCache.find(function(c) { return c.id === characterId; });
    if (!baseChar) {
        return JSON.stringify({ success: false, error: "Character not found." });
    }

    let userCharacters = getUserCharactersData(nk, ctx.userId!);
    let upgrades = userCharacters.upgrades[characterId] || { health: 0, damage: 0, speed: 0 };

    return JSON.stringify({
        success: true,
        character_id: characterId,
        owned: userCharacters.owned.indexOf(characterId) >= 0,
        stats: {
            health: calculateStatValue(baseChar.base_health, upgrades.health),
            damage: calculateStatValue(baseChar.base_damage, upgrades.damage),
            speed: calculateStatValue(baseChar.base_speed, upgrades.speed),
        },
        upgrade_levels: upgrades,
        upgrade_costs: {
            health: calculateUpgradeCost(upgrades.health),
            damage: calculateUpgradeCost(upgrades.damage),
            speed: calculateUpgradeCost(upgrades.speed),
        },
    });
};

unlockCharacterRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let characterId = request.character_id;
    let baseChar = allCharactersCache.find(function(c) { return c.id === characterId; });
    if (!baseChar) {
        return JSON.stringify({ success: false, error: "Character not found." });
    }

    let userCharacters = getUserCharactersData(nk, ctx.userId!);
    if (userCharacters.owned.indexOf(characterId) >= 0) {
        return JSON.stringify({ success: false, error: "Character already owned." });
    }

    if (baseChar.unlock_type === "gold") {
        let economy = getUserEconomyData(nk, ctx.userId!);
        let cost = baseChar.unlock_cost_gold || 0;
        if (economy.gold < cost) {
            return JSON.stringify({ success: false, error: "Not enough gold." });
        }
        economy.gold -= cost;
        economy.total_gold_spent += cost;
        saveUserEconomy(nk, ctx.userId!, economy);
    } else if (baseChar.unlock_type === "iap") {
        return JSON.stringify({ success: false, error: "Character requires IAP purchase." });
    }

    userCharacters.owned.push(characterId);
    if (!userCharacters.upgrades[characterId]) {
        userCharacters.upgrades[characterId] = { health: 0, damage: 0, speed: 0 };
    }
    saveUserCharacters(nk, ctx.userId!, userCharacters);

    return JSON.stringify({ success: true, character_id: characterId });
};

upgradeCharacterStatRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let characterId = request.character_id;
    let statId = request.stat;

    if (!["health", "damage", "speed"].includes(statId)) {
        return JSON.stringify({ success: false, error: "Invalid stat." });
    }

    let userCharacters = getUserCharactersData(nk, ctx.userId!);
    if (userCharacters.owned.indexOf(characterId) < 0) {
        return JSON.stringify({ success: false, error: "Character not owned." });
    }

    if (!userCharacters.upgrades[characterId]) {
        userCharacters.upgrades[characterId] = { health: 0, damage: 0, speed: 0 };
    }

    let currentLevel = userCharacters.upgrades[characterId][statId] || 0;
    if (currentLevel >= MAX_CHARACTER_LEVEL_PER_STAT) {
        return JSON.stringify({ success: false, error: "Stat already at max level." });
    }

    let cost = calculateUpgradeCost(currentLevel);
    let economy = getUserEconomyData(nk, ctx.userId!);
    if (economy.gold < cost) {
        return JSON.stringify({ success: false, error: "Not enough gold." });
    }

    economy.gold -= cost;
    economy.total_gold_spent += cost;
    userCharacters.upgrades[characterId][statId] = currentLevel + 1;

    saveUserEconomy(nk, ctx.userId!, economy);
    saveUserCharacters(nk, ctx.userId!, userCharacters);

    return JSON.stringify({ success: true, remaining_gold: economy.gold, new_level: currentLevel + 1 });
};