package com.hackathon.habitai.widget

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

object HabitWidgetStorage {
  private const val STORE_KEY = "habitai-store"
  private const val DB_NAME = "AsyncStorage"
  private const val TABLE_NAME = "Storage"

  fun readStore(context: Context): WidgetStore? {
    val raw = readRawStore(context) ?: return null
    val root = JSONObject(raw)
    val state = root.optJSONObject("state") ?: return null
    val habitsJson = state.optJSONArray("habits") ?: JSONArray()
    val logsJson = state.optJSONArray("logs") ?: JSONArray()

    val habits = buildList {
      for (index in 0 until habitsJson.length()) {
        val item = habitsJson.optJSONObject(index) ?: continue
        val schedule = item.optJSONObject("schedule") ?: JSONObject()
        val weekdays = mutableSetOf<Int>()
        val weekdaysJson = schedule.optJSONArray("weekdays")
        if (weekdaysJson != null) {
          for (dayIndex in 0 until weekdaysJson.length()) {
            weekdays.add(weekdaysJson.optInt(dayIndex))
          }
        }
        add(
          WidgetHabit(
            id = item.optString("id"),
            name = item.optString("name", "Habit"),
            color = parseColor(item.optString("color"), Color.rgb(96, 165, 250)),
            startDate = item.optString("startDate", LocalDate.now().toString()),
            endDate = item.optString("endDate").takeIf { it.isNotBlank() && it != "null" },
            archived = item.has("archivedAt") && !item.isNull("archivedAt"),
            scheduleKind = schedule.optString("kind", "daily"),
            weekdays = weekdays,
            count = if (schedule.has("count")) schedule.optInt("count") else null,
            everyDays = if (schedule.has("everyDays")) schedule.optInt("everyDays") else null,
          )
        )
      }
    }

    val logs = buildList {
      for (index in 0 until logsJson.length()) {
        val item = logsJson.optJSONObject(index) ?: continue
        add(
          WidgetLog(
            id = item.optString("id"),
            habitId = item.optString("habitId"),
            date = item.optString("date"),
            status = item.optString("status"),
            value = if (item.has("value") && !item.isNull("value")) item.optDouble("value") else null,
            completedAt = item.optString("completedAt").takeIf { it.isNotBlank() && it != "null" },
            updatedAt = item.optString("updatedAt", nowIso()),
          )
        )
      }
    }

    return WidgetStore(rawJson = raw, habits = habits, logs = logs)
  }

  fun activeHabits(context: Context): List<WidgetHabit> =
    readStore(context)?.habits?.filter { !it.archived && it.id.isNotBlank() } ?: emptyList()

  fun toggleToday(context: Context, habitId: String) {
    val raw = readRawStore(context) ?: return
    val root = JSONObject(raw)
    val state = root.optJSONObject("state") ?: return
    val logs = state.optJSONArray("logs") ?: JSONArray()
    val today = LocalDate.now().toString()
    var existingIndex = -1

    for (index in 0 until logs.length()) {
      val item = logs.optJSONObject(index) ?: continue
      if (item.optString("habitId") == habitId && item.optString("date") == today) {
        existingIndex = index
        break
      }
    }

    if (existingIndex >= 0 && logs.optJSONObject(existingIndex)?.optString("status") == "completed") {
      logs.remove(existingIndex)
    } else if (existingIndex >= 0) {
      val existing = logs.getJSONObject(existingIndex)
      existing.put("status", "completed")
      existing.put("completedAt", existing.optString("completedAt").ifBlank { nowIso() })
      existing.put("updatedAt", nowIso())
    } else {
      val next = JSONObject()
      next.put("id", "widget-log-${UUID.randomUUID()}")
      next.put("habitId", habitId)
      next.put("date", today)
      next.put("status", "completed")
      next.put("completedAt", nowIso())
      next.put("updatedAt", nowIso())
      logs.put(next)
    }

    state.put("logs", logs)
    if (state.has("session")) {
      val session = state.optJSONObject("session")
      if (session != null && session.optString("mode") != "guest") {
        session.put("syncStatus", "queued")
      }
    }
    writeRawStore(context, root.toString())
  }

  fun isCompleted(logs: List<WidgetLog>, habitId: String, date: LocalDate): Boolean =
    logs.any { it.habitId == habitId && it.date == date.toString() && it.status == "completed" }

  fun currentStreak(habit: WidgetHabit, logs: List<WidgetLog>): Int {
    var day = LocalDate.now()
    var streak = 0
    while (!day.isBefore(LocalDate.parse(habit.startDate))) {
      if (isCompleted(logs, habit.id, day)) {
        streak += 1
        day = day.minusDays(1)
      } else {
        break
      }
    }
    return streak
  }

  fun isScheduled(habit: WidgetHabit, date: LocalDate, logs: List<WidgetLog>): Boolean {
    val start = LocalDate.parse(habit.startDate)
    if (date.isBefore(start)) return false
    habit.endDate?.let {
      if (date.isAfter(LocalDate.parse(it))) return false
    }

    return when (habit.scheduleKind) {
      "daily" -> true
      "weekdays" -> habit.weekdays.contains(date.dayOfWeek.value % 7)
      "interval" -> {
        val every = habit.everyDays ?: 1
        ChronoUnit.DAYS.between(start, date).rem(every.toLong()) == 0L
      }
      "timesPerWeek", "timesPerMonth" -> true
      else -> true
    }
  }

  private fun readRawStore(context: Context): String? {
    val dbFile = context.getDatabasePath(DB_NAME)
    if (!dbFile.exists()) return null
    return SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
      db.rawQuery("SELECT value FROM $TABLE_NAME WHERE `key` = ?", arrayOf(STORE_KEY)).use { cursor ->
        if (cursor.moveToFirst()) cursor.getString(0) else null
      }
    }
  }

  private fun writeRawStore(context: Context, value: String) {
    val dbFile = context.getDatabasePath(DB_NAME)
    if (!dbFile.exists()) return
    SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READWRITE).use { db ->
      db.execSQL("INSERT OR REPLACE INTO $TABLE_NAME (`key`, value) VALUES (?, ?)", arrayOf(STORE_KEY, value))
    }
  }

  private fun parseColor(raw: String, fallback: Int): Int =
    try {
      Color.parseColor(raw)
    } catch (_: IllegalArgumentException) {
      fallback
    }

  private fun nowIso(): String = java.time.Instant.now().toString()
}
