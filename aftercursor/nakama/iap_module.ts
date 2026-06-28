// iap_module.ts
// RevenueCat webhook handler

let revenuecatWebhookRpc: nkruntime.RpcFunction;

revenuecatWebhookRpc = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let event = JSON.parse(payload);
    logger.info("RevenueCat webhook received: %s", JSON.stringify(event));

    let eventType = event.event_type;
    let appUserId = event.app_user_id;
    let productId = event.product_id;

    if (!appUserId) {
        logger.warn("No app_user_id in webhook event.");
        return JSON.stringify({ success: false, error: "Missing app_user_id" });
    }

    return JSON.stringify({ success: true });
};