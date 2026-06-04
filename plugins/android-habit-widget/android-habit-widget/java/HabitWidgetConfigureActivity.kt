package com.hackathon.habitai.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.ListView
import android.widget.TextView

class HabitWidgetConfigureActivity : Activity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      ?: AppWidgetManager.INVALID_APPWIDGET_ID
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    setContentView(resources.getIdentifier("habit_widget_picker", "layout", packageName))
    val habits = HabitWidgetStorage.activeHabits(this)
    val list = findViewById<ListView>(resources.getIdentifier("habit_picker_list", "id", packageName))
    list.adapter = HabitAdapter(this, habits)
    list.setOnItemClickListener { _, _, position, _ ->
      val habit = habits[position]
      HabitWidgetProvider.saveHabitSelection(this, widgetId, habit.id)
      HabitWidgetProvider.updateWidget(this, AppWidgetManager.getInstance(this), widgetId)
      setResult(
        RESULT_OK,
        Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId),
      )
      finish()
    }
  }

  private class HabitAdapter(
    private val context: Context,
    private val habits: List<WidgetHabit>,
  ) : BaseAdapter() {
    private val store = HabitWidgetStorage.readStore(context)

    override fun getCount(): Int = habits.size
    override fun getItem(position: Int): WidgetHabit = habits[position]
    override fun getItemId(position: Int): Long = position.toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
      val view = convertView ?: LayoutInflater.from(context).inflate(
        context.resources.getIdentifier("habit_widget_picker_row", "layout", context.packageName),
        parent,
        false,
      )
      val habit = habits[position]
      view.findViewById<TextView>(context.id("habit_picker_name")).text = habit.name
      view.findViewById<TextView>(context.id("habit_picker_streak")).text =
        "${HabitWidgetStorage.currentStreak(habit, store?.logs ?: emptyList())} day streak"

      val dot = view.findViewById<TextView>(context.id("habit_picker_dot"))
      dot.background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(habit.color)
      }
      return view
    }

    private fun Context.id(name: String): Int = resources.getIdentifier(name, "id", packageName)
  }
}
