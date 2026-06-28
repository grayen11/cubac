// main.ts - Nakama InitModule
// Tüm RPC, hook ve match handler kayıtlarının yapıldığı giriş noktası

import "./account_module";
import "./economy_module";
import "./iap_module";
import "./matchmaker_module";
import "./battle_match_handler";
import "./battle_combat_module";
import "./battle_result_module";
import "./battle_map_rules_module";
import "./battle_item_spawner_module";
import "./clan_module";
import "./anticheat_module";
import "./ad_config_rpc";
import "./version_check_rpc";

// Storage Collection/Key Schema (merkezi tanımlar)
const StorageCollections = {
    USER_PROFILE: "user_profile",
    USER_ECONOMY: "user_economy",
    USER_CHARACTERS: "user_characters",
    USER_SETTINGS: "user_settings",
    USER_DELETION: "user_deletion",
    CLAN_DATA: "clan_data",
    MATCH_STATE: "match_state",
    LEADERBOARD: "leaderboard",
    ADMIN_CONFIG: "admin_config",
    IAP_RECEIPTS: "iap_receipts",
    REPORT_LOGS: "report_logs",
    ANTICHEAT_FLAGS: "anticheat_flags",
    USERNAME_COOLDOWN: "username_cooldown",
    AD_CONFIG: "ad_config",
} as const;

const StorageKeys = {
    ECONOMY: "economy_data",
    CHARACTERS: "characters_data",
    SETTINGS: "settings_data",
    PROFILE: "profile_data",
    DELETION_REQUEST: "deletion_request",
    VERSION_LIST: "version_list",
    AD_CONFIG: "ad_config_data",
    USERNAME_COOLDOWN: "cooldown",
    MATCH_STATS: "match_stats",
    REPORT: "report",
} as const;

// Global constants
const GOLD_WIN = 1500;
const GOLD_LOSS = 500;
const AFK_TIMEOUT_SEC = 30;
const BOT_FILL_TIMEOUT_SEC = 15;
const MAX_CHARACTER_LEVEL_PER_STAT = 50;
const USERNAME_COOLDOWN_DAYS = 2;
const ITEM_DESPAWN_SEC = 30;

let InitModule: nkruntime.InitModule = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info("Initializing Clans Online server module...");

    // ============ Account Module Hooks & RPCs ============
    initializer.registerBeforeAuthenticateApple(beforeAuthenticateApple);
    initializer.registerBeforeAuthenticateGoogle(beforeAuthenticateGoogle);
    initializer.registerBeforeAuthenticateEmail(beforeAuthenticateEmail);
    initializer.registerAfterAuthenticateApple(afterAuthenticateApple);
    initializer.registerAfterAuthenticateGoogle(afterAuthenticateGoogle);
    initializer.registerAfterAuthenticateEmail(afterAuthenticateEmail);
    initializer.registerRpc("update_username", updateUsernameRpc);
    initializer.registerRpc("update_profile_picture", updateProfilePictureRpc);
    initializer.registerRpc("request_account_deletion", requestAccountDeletionRpc);
    initializer.registerRpc("check_deletion_status", checkDeletionStatusRpc);
    initializer.registerRpc("toggle_email_auth_visibility", toggleEmailAuthVisibilityRpc);

    // ============ Version Check RPC ============
    initializer.registerRpc("check_version", checkVersionRpc);

    // ============ Economy Module RPCs ============
    initializer.registerRpc("get_economy", getEconomyRpc);
    initializer.registerRpc("get_character_stats", getCharacterStatsRpc);
    initializer.registerRpc("unlock_character", unlockCharacterRpc);
    initializer.registerRpc("upgrade_character_stat", upgradeCharacterStatRpc);
    initializer.registerRpc("get_all_characters_base_stats", getAllCharactersBaseStatsRpc);

    // ============ IAP Module (RevenueCat Webhook) ============
    initializer.registerRpc("revenuecat_webhook", revenuecatWebhookRpc);

    // ============ Matchmaker Module ============
    initializer.registerRpc("request_match", requestMatchRpc);
    initializer.registerRpc("cancel_match", cancelMatchRpc);
    initializer.registerMatchmakerMatched(matchmakerMatchedHook);

    // ============ Battle Match Handler ============
    initializer.registerMatch("battle_match", {
        matchInit: matchInit,
        matchJoin: matchJoin,
        matchJoinAttempt: matchJoinAttempt,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal,
    });

    // ============ Clan Module RPCs ============
    initializer.registerRpc("clan_create", clanCreateRpc);
    initializer.registerRpc("clan_join", clanJoinRpc);
    initializer.registerRpc("clan_leave", clanLeaveRpc);
    initializer.registerRpc("clan_list", clanListRpc);
    initializer.registerRpc("clan_info", clanInfoRpc);
    initializer.registerRpc("clan_kick", clanKickRpc);
    initializer.registerRpc("clan_promote", clanPromoteRpc);
    initializer.registerRpc("clan_search", clanSearchRpc);
    initializer.registerRpc("clan_start_team_match", clanStartTeamMatchRpc);
    initializer.registerBeforeGetAccount(beforeGetAccountHook);

    // ============ Anticheat Module ============
    initializer.registerRpc("report_player", reportPlayerRpc);
    initializer.registerRpc("get_report_status", getReportStatusRpc);

    // ============ Ad Config RPC ============
    initializer.registerRpc("get_ad_config", getAdConfigRpc);

    // ============ Admin RPCs ============
    initializer.registerRpc("admin_set_version_list", adminSetVersionListRpc);
    initializer.registerRpc("admin_set_ad_config", adminSetAdConfigRpc);
    initializer.registerRpc("admin_ban_player", adminBanPlayerRpc);
    initializer.registerRpc("admin_unban_player", adminUnbanPlayerRpc);

    logger.info("Clans Online server module initialized successfully.");
}

export const InitModule_generated = InitModule;