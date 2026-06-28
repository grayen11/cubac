// battle_map_rules_module.ts
// Harita bazlı kurallar

let mapRulesDatabase: any[] = [
    {
        map_id: "map_arena_1",
        map_name: "Battle Arena",
        game_mode: "kill_based",
        team_size: 3,
        match_duration_sec: 180,
        win_condition: "first_team_to_10_kills_or_highest_at_timeout",
        spawn_points: [
            [{ x: -500, y: -300 }, { x: -500, y: 0 }, { x: -500, y: 300 }],
            [{ x: 500, y: -300 }, { x: 500, y: 0 }, { x: 500, y: 300 }],
        ],
        item_spawn_zones: [
            { x: 0, y: 0, radius: 300 },
            { x: -200, y: 200, radius: 150 },
            { x: 200, y: -200, radius: 150 },
        ],
    },
    {
        map_id: "map_soccer_1",
        map_name: "Soccer Field",
        game_mode: "goal_based",
        team_size: 4,
        match_duration_sec: 240,
        win_condition: "first_team_to_5_goals_or_highest_at_timeout",
        spawn_points: [
            [{ x: -400, y: -300 }, { x: -400, y: -100 }, { x: -400, y: 100 }, { x: -400, y: 300 }],
            [{ x: 400, y: -300 }, { x: 400, y: -100 }, { x: 400, y: 100 }, { x: 400, y: 300 }],
        ],
        item_spawn_zones: [
            { x: 0, y: 0, radius: 400 },
            { x: -200, y: 0, radius: 200 },
            { x: 200, y: 0, radius: 200 },
        ],
        goal_positions: [
            { x: -600, y: 0 },
            { x: 600, y: 0 },
        ],
    },
    {
        map_id: "map_forest_1",
        map_name: "Enchanted Forest",
        game_mode: "kill_based",
        team_size: 3,
        match_duration_sec: 210,
        win_condition: "first_team_to_15_kills_or_highest_at_timeout",
        spawn_points: [
            [{ x: -450, y: -250 }, { x: -450, y: 0 }, { x: -450, y: 250 }],
            [{ x: 450, y: -250 }, { x: 450, y: 0 }, { x: 450, y: 250 }],
        ],
        item_spawn_zones: [
            { x: 0, y: 0, radius: 250 },
            { x: -150, y: -150, radius: 100 },
            { x: 150, y: 150, radius: 100 },
            { x: 0, y: 200, radius: 120 },
        ],
    },
    {
        map_id: "map_castle_1",
        map_name: "Castle Siege",
        game_mode: "goal_based",
        team_size: 4,
        match_duration_sec: 300,
        win_condition: "first_team_to_3_goals_or_highest_at_timeout",
        spawn_points: [
            [{ x: -350, y: -350 }, { x: -350, y: -150 }, { x: -350, y: 150 }, { x: -350, y: 350 }],
            [{ x: 350, y: -350 }, { x: 350, y: -150 }, { x: 350, y: 150 }, { x: 350, y: 350 }],
        ],
        item_spawn_zones: [
            { x: 0, y: -200, radius: 180 },
            { x: 0, y: 200, radius: 180 },
            { x: 0, y: 0, radius: 150 },
        ],
        goal_positions: [
            { x: -500, y: 0 },
            { x: 500, y: 0 },
        ],
    },
];

function getMapRules(mapId: string): any {
    if (mapId === "random") {
        return getRandomMapRules();
    }
    return mapRulesDatabase.find(function(m) { return m.map_id === mapId; }) || null;
}

function getRandomMapRules(): any {
    return mapRulesDatabase[Math.floor(Math.random() * mapRulesDatabase.length)];
}