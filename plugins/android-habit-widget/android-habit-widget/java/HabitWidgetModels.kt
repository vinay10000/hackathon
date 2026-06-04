package com.hackathon.habitai.widget

data class WidgetHabit(
  val id: String,
  val name: String,
  val color: Int,
  val startDate: String,
  val endDate: String?,
  val archived: Boolean,
  val scheduleKind: String,
  val weekdays: Set<Int>,
  val count: Int?,
  val everyDays: Int?,
)

data class WidgetLog(
  val id: String,
  val habitId: String,
  val date: String,
  val status: String,
  val value: Double?,
  val completedAt: String?,
  val updatedAt: String,
)

data class WidgetStore(
  val rawJson: String,
  val habits: List<WidgetHabit>,
  val logs: List<WidgetLog>,
)
