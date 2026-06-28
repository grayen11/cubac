// ad_config_rpc.ts
// Sonuçlar sahnesindeki reklam alanı için konfigürasyon

let getAdConfigRpc: nkruntime.RpcFunction;
let adminSetAdConfigRpc: nkruntime.RpcFunction;

getAdConfigRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    return JSON.stringify({
        success: true,
        ad_config: {
            image_url: '',
            target_url: '',
            display_text: '',
            enabled: false,
        }
    });
};

adminSetAdConfigRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let request = JSON.parse(payload);
    logger.info("Ad config updated by admin.");
    return JSON.stringify({ success: true });
};