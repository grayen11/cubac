// version_check_rpc.ts
// Client'ın build versiyonunu kontrol eden RPC

let checkVersionRpc: nkruntime.RpcFunction;
let adminSetVersionListRpc: nkruntime.RpcFunction;

checkVersionRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let clientPlatform: 'android' | 'ios' = request.platform;
    let clientVersionCode = request.version_code;
    let clientVersionName = request.version_name;

    // Get version list from storage
    let versionStorage = nk.storageRead([{ collection: StorageCollections.ADMIN_CONFIG, key: StorageKeys.VERSION_LIST, userId: "admin" }]);
    let versionList: any[] = [];

    if (versionStorage && versionStorage.length > 0) {
        versionList = versionStorage[0].value?.versions || [];
    }

    // Find matching platform versions
    let platformVersions = versionList.filter(v => v.platform === clientPlatform);

    if (platformVersions.length === 0) {
        // No version restrictions set
        return JSON.stringify({ update_required: false, latest_version: clientVersionName, message: "No version restrictions." });
    }

    // Check if client version is in the allowed list
    let isAllowed = platformVersions.some(v => v.version_code === clientVersionCode && v.version_name === clientVersionName);

    if (isAllowed) {
        return JSON.stringify({ update_required: false, latest_version: clientVersionName, message: "Version is up to date." });
    }

    // Find the latest version entry for this platform
    let latestVersion = platformVersions.reduce((latest, current) => {
        return current.version_code > latest.version_code ? current : latest;
    }, platformVersions[0]);

    if (latestVersion.required) {
        return JSON.stringify({
            update_required: true,
            latest_version: latestVersion.version_name,
            update_url: latestVersion.update_url,
            message: "A new version of the game is available. Please update to continue."
        });
    } else {
        return JSON.stringify({
            update_required: false,
            latest_version: latestVersion.version_name,
            update_url: latestVersion.update_url,
            message: "A new version is available (optional)."
        });
    }
};

// Admin RPC to set version list
adminSetVersionListRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    let versions: any[] = request.versions;

    nk.storageWrite([{ collection: StorageCollections.ADMIN_CONFIG, key: StorageKeys.VERSION_LIST, userId: "admin", value: { versions: versions, updated_at: Date.now() }, permissionRead: 2, permissionWrite: 0 }]);

    logger.info("Version list updated by admin.");
    return JSON.stringify({ success: true, versions_count: versions.length });
};