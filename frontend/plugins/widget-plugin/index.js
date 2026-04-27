/**
 * Expo Config Plugin for DocScan Pro Home Screen Widgets
 * 
 * This plugin injects native iOS (WidgetKit) and Android (AppWidgetProvider)
 * widget extensions during the prebuild/eas build process.
 * 
 * Usage in app.json:
 *   "plugins": ["./plugins/widget-plugin"]
 */
const { withPlugins } = require('@expo/config-plugins');
const withiOSWidget = require('./ios/withiOSWidget');
const withAndroidWidget = require('./android/withAndroidWidget');

function withDocScanWidget(config) {
  return withPlugins(config, [
    withiOSWidget,
    withAndroidWidget,
  ]);
}

module.exports = withDocScanWidget;
