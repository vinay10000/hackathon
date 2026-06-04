const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'android-habit-widget', 'android-habit-widget');

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const child of fs.readdirSync(from)) {
      copyRecursive(path.join(from, child), path.join(to, child));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

module.exports = function withAndroidHabitWidget(config) {
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformRoot = modConfig.modRequest.platformProjectRoot;
      const packageName = modConfig.android?.package;
      if (!packageName) {
        throw new Error('Android package is required for the HabitAI widget plugin.');
      }

      const packagePath = packageName.replace(/\./g, path.sep);
      copyRecursive(path.join(sourceDir, 'res'), path.join(platformRoot, 'app', 'src', 'main', 'res'));
      copyRecursive(
        path.join(sourceDir, 'java'),
        path.join(platformRoot, 'app', 'src', 'main', 'java', packagePath, 'widget'),
      );

      return modConfig;
    },
  ]);

  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      return modConfig;
    }

    application.$['android:resizeableActivity'] = 'true';

    application.activity = application.activity ?? [];
    if (!application.activity.some((activity) => activity.$['android:name'] === '.widget.HabitWidgetConfigureActivity')) {
      application.activity.push({
        $: {
          'android:name': '.widget.HabitWidgetConfigureActivity',
          'android:exported': 'true',
          'android:theme': '@style/HabitWidgetTheme',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE' } }],
          },
        ],
      });
    }

    application.receiver = application.receiver ?? [];
    if (!application.receiver.some((receiver) => receiver.$['android:name'] === '.widget.HabitWidgetProvider')) {
      application.receiver.push({
        $: {
          'android:name': '.widget.HabitWidgetProvider',
          'android:exported': 'true',
          'android:label': 'HabitAI Card',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
              { $: { 'android:name': 'com.hackathon.habitai.widget.TOGGLE_TODAY' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/habit_widget_info',
            },
          },
        ],
      });
    }

    return modConfig;
  });

  return config;
};
