package com.balance.journal;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONException;
import org.json.JSONObject;

/** ווידג'ט מסך הבית: נקודות, ציון איזון, מים, האירוע הקרוב, מנטרה + כפתורי SOS / מים / יומן */
public class BalanceWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "balance_widget";
    static final String KEY_DATA = "data";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, BalanceWidgetProvider.class));
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.balance_widget);

        JSONObject d;
        try {
            d = new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, "{}"));
        } catch (JSONException e) {
            d = new JSONObject();
        }

        String name = d.optString("name", "");
        views.setTextViewText(R.id.widget_title, name.isEmpty() ? "🌿 איזון יומי" : "🌿 היי, " + name);

        if (d.has("points")) {
            String stats = "⭐ " + d.optInt("points", 0)
                + "   ·   ציון " + d.optString("score", "-")
                + "   ·   💧 " + d.optInt("water", 0) + "/" + d.optInt("waterTarget", 10);
            views.setTextViewText(R.id.widget_stats, stats);
        } else {
            views.setTextViewText(R.id.widget_stats, "פתחי את האפליקציה פעם אחת לסנכרון");
        }

        views.setTextViewText(R.id.widget_event, d.optString("nextEvent", "📅 אין אירועים קרובים"));
        views.setTextViewText(R.id.widget_mantra, d.optString("mantra", ""));

        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, "day", 10));
        views.setOnClickPendingIntent(R.id.widget_sos, openApp(context, "sos", 11));
        views.setOnClickPendingIntent(R.id.widget_water, openApp(context, "water", 12));
        views.setOnClickPendingIntent(R.id.widget_journal, openApp(context, "journal", 13));
        return views;
    }

    private static PendingIntent openApp(Context context, String action, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("balanceapp://" + action), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
