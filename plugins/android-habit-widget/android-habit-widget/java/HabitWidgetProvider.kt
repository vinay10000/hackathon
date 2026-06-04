package com.hackathon.habitai.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate

class HabitWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { updateWidget(context, manager, it) }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_TOGGLE_TODAY) {
      val habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: return
      HabitWidgetStorage.toggleToday(context, habitId)
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, HabitWidgetProvider::class.java))
      ids.forEach { updateWidget(context, manager, it) }
    }
  }

  companion object {
    const val ACTION_TOGGLE_TODAY = "com.hackathon.habitai.widget.TOGGLE_TODAY"
    const val EXTRA_HABIT_ID = "habitId"
    private const val PREFS = "habitai_widget"
    private const val KEY_HABIT_PREFIX = "habit_"

    fun saveHabitSelection(context: Context, widgetId: Int, habitId: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_HABIT_PREFIX + widgetId, habitId).apply()
    }

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
      val views = RemoteViews(context.packageName, context.resources.getIdentifier("habit_widget", "layout", context.packageName))
      val store = HabitWidgetStorage.readStore(context)
      val selectedId = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_HABIT_PREFIX + widgetId, null)
      val habit = store?.habits?.firstOrNull { it.id == selectedId && !it.archived }
        ?: store?.habits?.firstOrNull { !it.archived }

      if (store == null || habit == null) {
        views.setTextViewText(context.id("habit_widget_title"), "HabitAI")
        views.setTextViewText(context.id("habit_widget_streak"), "Create a habit in the app")
        views.setViewVisibility(context.id("habit_widget_done"), View.GONE)
        views.removeAllViews(context.id("habit_widget_grid"))
        manager.updateAppWidget(widgetId, views)
        return
      }

      val today = LocalDate.now()
      val completedToday = HabitWidgetStorage.isCompleted(store.logs, habit.id, today)
      views.setViewVisibility(context.id("habit_widget_done"), View.VISIBLE)
      views.setTextViewText(context.id("habit_widget_title"), habit.name)
      views.setTextViewText(context.id("habit_widget_streak"), "Streak: ${HabitWidgetStorage.currentStreak(habit, store.logs)} days")
      views.setInt(context.id("habit_widget_done"), "setBackgroundColor", if (completedToday) habit.color else Color.rgb(37, 48, 68))

      val toggleIntent = Intent(context, HabitWidgetProvider::class.java).apply {
        action = ACTION_TOGGLE_TODAY
        putExtra(EXTRA_HABIT_ID, habit.id)
      }
      val pendingToggle = PendingIntent.getBroadcast(
        context,
        widgetId,
        toggleIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(context.id("habit_widget_done"), pendingToggle)

      val gridId = context.id("habit_widget_grid")
      views.removeAllViews(gridId)
      val start = today.minusDays(69)
      for (index in 0 until 70) {
        val date = start.plusDays(index.toLong())
        val cell = RemoteViews(context.packageName, context.resources.getIdentifier("habit_widget_cell", "layout", context.packageName))
        val color = when {
          HabitWidgetStorage.isCompleted(store.logs, habit.id, date) -> habit.color
          HabitWidgetStorage.isScheduled(habit, date, store.logs) -> Color.rgb(37, 48, 68)
          else -> Color.rgb(24, 29, 40)
        }
        cell.setInt(context.id("habit_widget_cell"), "setBackgroundColor", color)
        views.addView(gridId, cell)
      }

      manager.updateAppWidget(widgetId, views)
    }

    private fun Context.id(name: String): Int = resources.getIdentifier(name, "id", packageName)
  }
}
