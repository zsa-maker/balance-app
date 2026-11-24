package com.balance.journal;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data", "{}");
        Context ctx = getContext();
        ctx.getSharedPreferences(BalanceWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(BalanceWidgetProvider.KEY_DATA, data)
            .apply();
        BalanceWidgetProvider.refreshAll(ctx);
        call.resolve();
    }
}
