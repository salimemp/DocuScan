/**
 * Android Widget Config Plugin
 * Adds AppWidgetProvider to the Android project
 */
const {
  withAndroidManifest,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withAndroidWidget(config) {
  // Step 0: Ensure AndroidX + Jetifier enabled (safety net for legacy support-lib deps)
  config = withGradleProperties(config, (cfg) => {
    const ensureProp = (key, value) => {
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    };
    ensureProp('android.useAndroidX', 'true');
    ensureProp('android.enableJetifier', 'true');
    return cfg;
  });

  // Step 1: Add widget receivers to AndroidManifest.xml
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const application = manifest.manifest.application?.[0];
    
    if (!application) return mod;

    // --- FIX: Manifest merger conflict between AndroidX (androidx.core.app.CoreComponentFactory)
    // and legacy android.support (from @react-native-voice/voice 3.x which still ships old support libs).
    // Without this, Gradle fails: "Attribute application@appComponentFactory is also present at
    // [com.android.support:support-compat:28.0.0]". We instruct the merger to keep the AndroidX value.
    if (!manifest.manifest.$) manifest.manifest.$ = {};
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    const existingReplace = application.$?.['tools:replace'] || '';
    const replaceAttrs = new Set(
      existingReplace.split(',').map((s) => s.trim()).filter(Boolean)
    );
    replaceAttrs.add('android:appComponentFactory');
    application.$['tools:replace'] = Array.from(replaceAttrs).join(',');
    application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    // Ensure receivers array exists
    if (!application.receiver) {
      application.receiver = [];
    }

    const packageName = config.android?.package || 'com.docscanpro.app';

    // Add Quick Scan Widget receiver
    const widgetReceivers = [
      {
        name: `${packageName}.widget.QuickScanWidgetProvider`,
        label: 'Quick Scan',
        metadata: 'quick_scan_widget_info',
      },
      {
        name: `${packageName}.widget.RecentDocsWidgetProvider`,
        label: 'Recent Documents',
        metadata: 'recent_docs_widget_info',
      },
      {
        name: `${packageName}.widget.DashboardWidgetProvider`,
        label: 'Dashboard',
        metadata: 'dashboard_widget_info',
      },
    ];

    for (const widget of widgetReceivers) {
      // Check if receiver already exists
      const exists = application.receiver.some(
        (r) => r.$?.['android:name'] === widget.name
      );
      if (!exists) {
        application.receiver.push({
          $: {
            'android:name': widget.name,
            'android:label': widget.label,
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': `@xml/${widget.metadata}`,
              },
            },
          ],
        });
      }
    }

    return mod;
  });

  // Step 2: Write Kotlin source files and XML resources
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const packageName = config.android?.package || 'com.docscanpro.app';
      const packagePath = packageName.replace(/\./g, '/');
      
      // Paths
      const androidDir = path.join(projectRoot, 'android');
      const mainDir = path.join(androidDir, 'app', 'src', 'main');
      const kotlinDir = path.join(mainDir, 'java', packagePath, 'widget');
      const resDir = path.join(mainDir, 'res');
      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');

      // Create directories
      [kotlinDir, xmlDir, layoutDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Write Kotlin files
      writeKotlinFiles(kotlinDir, packageName);
      
      // Write XML widget info files
      writeWidgetInfoXml(xmlDir);
      
      // Write layout files
      writeWidgetLayouts(layoutDir);

      return mod;
    },
  ]);

  return config;
}

function writeKotlinFiles(kotlinDir, packageName) {
  const fs = require('fs');
  const path = require('path');

  // WidgetDataProvider.kt
  fs.writeFileSync(path.join(kotlinDir, 'WidgetDataProvider.kt'), `package ${packageName}.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import org.json.JSONArray

data class WidgetDocData(
    val totalScans: Int = 0,
    val lastScanDate: String? = null,
    val storageUsed: String = "0 KB",
    val recentDocuments: List<RecentDoc> = emptyList(),
    val userName: String? = null,
    val subscriptionTier: String = "free"
)

data class RecentDoc(
    val id: String,
    val title: String,
    val thumbnail: String? = null,
    val date: String
)

object WidgetDataProvider {
    private const val PREFS_NAME = "DocScanProWidgetPrefs"
    private const val DATA_KEY = "widgetData"

    fun getData(context: Context): WidgetDocData {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(DATA_KEY, null) ?: return WidgetDocData()
        
        return try {
            val obj = JSONObject(json)
            val docs = mutableListOf<RecentDoc>()
            val docsArray = obj.optJSONArray("recentDocuments") ?: JSONArray()
            for (i in 0 until docsArray.length()) {
                val doc = docsArray.getJSONObject(i)
                docs.add(RecentDoc(
                    id = doc.optString("id", ""),
                    title = doc.optString("title", "Untitled"),
                    thumbnail = doc.optString("thumbnail", null),
                    date = doc.optString("date", "")
                ))
            }
            WidgetDocData(
                totalScans = obj.optInt("totalScans", 0),
                lastScanDate = obj.optString("lastScanDate", null),
                storageUsed = obj.optString("storageUsed", "0 KB"),
                recentDocuments = docs,
                userName = obj.optString("userName", null),
                subscriptionTier = obj.optString("subscriptionTier", "free")
            )
        } catch (e: Exception) {
            WidgetDocData()
        }
    }

    fun saveData(context: Context, data: WidgetDocData) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = JSONObject().apply {
            put("totalScans", data.totalScans)
            put("lastScanDate", data.lastScanDate)
            put("storageUsed", data.storageUsed)
            put("userName", data.userName)
            put("subscriptionTier", data.subscriptionTier)
            put("recentDocuments", JSONArray().also { arr ->
                data.recentDocuments.forEach { doc ->
                    arr.put(JSONObject().apply {
                        put("id", doc.id)
                        put("title", doc.title)
                        put("thumbnail", doc.thumbnail)
                        put("date", doc.date)
                    })
                }
            })
        }
        prefs.edit().putString(DATA_KEY, json.toString()).apply()
    }
}
`);

  // QuickScanWidgetProvider.kt
  fs.writeFileSync(path.join(kotlinDir, 'QuickScanWidgetProvider.kt'), `package ${packageName}.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import ${packageName}.R

class QuickScanWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateQuickScanWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateQuickScanWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val data = WidgetDataProvider.getData(context)
            val views = RemoteViews(context.packageName, R.layout.widget_quick_scan)

            // Update scan count
            views.setTextViewText(R.id.widget_scan_count, data.totalScans.toString())
            views.setTextViewText(R.id.widget_scan_label, "scans")

            // Set click to open scan
            val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://scan"))
            val scanPendingIntent = PendingIntent.getActivity(
                context, 0, scanIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_scan_button, scanPendingIntent)

            // Set click on whole widget to open app
            val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://dashboard"))
            val openPendingIntent = PendingIntent.getActivity(
                context, 1, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`);

  // RecentDocsWidgetProvider.kt
  fs.writeFileSync(path.join(kotlinDir, 'RecentDocsWidgetProvider.kt'), `package ${packageName}.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import ${packageName}.R

class RecentDocsWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateRecentDocsWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateRecentDocsWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val data = WidgetDataProvider.getData(context)
            val views = RemoteViews(context.packageName, R.layout.widget_recent_docs)

            // Show or hide empty state
            if (data.recentDocuments.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty_state, View.VISIBLE)
                views.setViewVisibility(R.id.widget_docs_container, View.GONE)
            } else {
                views.setViewVisibility(R.id.widget_empty_state, View.GONE)
                views.setViewVisibility(R.id.widget_docs_container, View.VISIBLE)
                
                // Update first 3 document slots
                val docViews = listOf(
                    Pair(R.id.widget_doc_1_title, R.id.widget_doc_1),
                    Pair(R.id.widget_doc_2_title, R.id.widget_doc_2),
                    Pair(R.id.widget_doc_3_title, R.id.widget_doc_3)
                )
                
                for (i in docViews.indices) {
                    if (i < data.recentDocuments.size) {
                        val doc = data.recentDocuments[i]
                        views.setTextViewText(docViews[i].first, doc.title)
                        views.setViewVisibility(docViews[i].second, View.VISIBLE)
                        
                        val docIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://document/\${doc.id}"))
                        val docPendingIntent = PendingIntent.getActivity(
                            context, i + 10, docIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(docViews[i].second, docPendingIntent)
                    } else {
                        views.setViewVisibility(docViews[i].second, View.GONE)
                    }
                }
            }

            // Scan button
            val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://scan"))
            val scanPendingIntent = PendingIntent.getActivity(
                context, 20, scanIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_scan_button, scanPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`);

  // DashboardWidgetProvider.kt
  fs.writeFileSync(path.join(kotlinDir, 'DashboardWidgetProvider.kt'), `package ${packageName}.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import ${packageName}.R

class DashboardWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateDashboardWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateDashboardWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val data = WidgetDataProvider.getData(context)
            val views = RemoteViews(context.packageName, R.layout.widget_dashboard)

            // Update stats
            views.setTextViewText(R.id.widget_total_scans, data.totalScans.toString())
            views.setTextViewText(R.id.widget_storage, data.storageUsed)
            views.setTextViewText(R.id.widget_last_scan, data.lastScanDate ?: "Never")

            // Update recent documents
            if (data.recentDocuments.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty_state, View.VISIBLE)
                views.setViewVisibility(R.id.widget_docs_list, View.GONE)
            } else {
                views.setViewVisibility(R.id.widget_empty_state, View.GONE)
                views.setViewVisibility(R.id.widget_docs_list, View.VISIBLE)
                
                val docSlots = listOf(
                    Triple(R.id.widget_doc_row_1, R.id.widget_doc_1_title, R.id.widget_doc_1_date),
                    Triple(R.id.widget_doc_row_2, R.id.widget_doc_2_title, R.id.widget_doc_2_date),
                    Triple(R.id.widget_doc_row_3, R.id.widget_doc_3_title, R.id.widget_doc_3_date),
                    Triple(R.id.widget_doc_row_4, R.id.widget_doc_4_title, R.id.widget_doc_4_date)
                )
                
                for (i in docSlots.indices) {
                    if (i < data.recentDocuments.size) {
                        val doc = data.recentDocuments[i]
                        views.setTextViewText(docSlots[i].second, doc.title)
                        views.setTextViewText(docSlots[i].third, doc.date)
                        views.setViewVisibility(docSlots[i].first, View.VISIBLE)
                        
                        val docIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://document/\${doc.id}"))
                        val docPendingIntent = PendingIntent.getActivity(
                            context, i + 30, docIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(docSlots[i].first, docPendingIntent)
                    } else {
                        views.setViewVisibility(docSlots[i].first, View.GONE)
                    }
                }
            }

            // Quick action buttons
            val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://scan"))
            views.setOnClickPendingIntent(R.id.widget_scan_button, PendingIntent.getActivity(
                context, 40, scanIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            ))

            val historyIntent = Intent(Intent.ACTION_VIEW, Uri.parse("docscanpro://history"))
            views.setOnClickPendingIntent(R.id.widget_history_button, PendingIntent.getActivity(
                context, 41, historyIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            ))

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`);
}

function writeWidgetInfoXml(xmlDir) {
  const fs = require('fs');
  const path = require('path');

  // Quick Scan Widget Info
  fs.writeFileSync(path.join(xmlDir, 'quick_scan_widget_info.xml'), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_quick_scan"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@mipmap/ic_launcher"
    android:description="@string/app_name" />
`);

  // Recent Docs Widget Info
  fs.writeFileSync(path.join(xmlDir, 'recent_docs_widget_info.xml'), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_recent_docs"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@mipmap/ic_launcher"
    android:description="@string/app_name" />
`);

  // Dashboard Widget Info
  fs.writeFileSync(path.join(xmlDir, 'dashboard_widget_info.xml'), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="250dp"
    android:targetCellWidth="4"
    android:targetCellHeight="4"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_dashboard"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@mipmap/ic_launcher"
    android:description="@string/app_name" />
`);
}

function writeWidgetLayouts(layoutDir) {
  const fs = require('fs');
  const path = require('path');

  // Quick Scan Widget Layout
  fs.writeFileSync(path.join(layoutDir, 'widget_quick_scan.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@android:color/white">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <ImageView
            android:layout_width="24dp"
            android:layout_height="24dp"
            android:src="@android:drawable/ic_menu_camera"
            android:contentDescription="DocScan" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="DocScan Pro"
                android:textSize="12sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/widget_scan_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="scans"
                android:textSize="10sp"
                android:textColor="#666666" />
        </LinearLayout>

        <TextView
            android:id="@+id/widget_scan_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="0"
            android:textSize="24sp"
            android:textStyle="bold"
            android:textColor="#2563EB" />
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1" />

    <Button
        android:id="@+id/widget_scan_button"
        android:layout_width="match_parent"
        android:layout_height="36dp"
        android:text="Scan"
        android:textSize="12sp"
        android:textColor="#FFFFFF"
        android:backgroundTint="#2563EB" />
</LinearLayout>
`);

  // Recent Docs Widget Layout
  fs.writeFileSync(path.join(layoutDir, 'widget_recent_docs.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@android:color/white">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Recent Documents"
            android:textSize="14sp"
            android:textStyle="bold" />

        <ImageButton
            android:id="@+id/widget_scan_button"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:src="@android:drawable/ic_menu_camera"
            android:background="?android:attr/selectableItemBackground"
            android:contentDescription="Scan" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_empty_state"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="No documents yet"
        android:textSize="12sp"
        android:textColor="#999999"
        android:gravity="center"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/widget_docs_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal">

        <LinearLayout
            android:id="@+id/widget_doc_1"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_margin="4dp"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#F0F5FF">
            <TextView
                android:id="@+id/widget_doc_1_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="10sp"
                android:maxLines="1"
                android:ellipsize="end" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/widget_doc_2"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_margin="4dp"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#F0F5FF">
            <TextView
                android:id="@+id/widget_doc_2_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="10sp"
                android:maxLines="1"
                android:ellipsize="end" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/widget_doc_3"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_margin="4dp"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#F0F5FF">
            <TextView
                android:id="@+id/widget_doc_3_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="10sp"
                android:maxLines="1"
                android:ellipsize="end" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
`);

  // Dashboard Widget Layout
  fs.writeFileSync(path.join(layoutDir, 'widget_dashboard.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@android:color/white">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="DocScan Pro"
        android:textSize="16sp"
        android:textStyle="bold" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#EBF5FF">
            <TextView
                android:id="@+id/widget_total_scans"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textStyle="bold"
                android:textColor="#2563EB" />
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Scans"
                android:textSize="10sp"
                android:textColor="#666666" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="4dp"
            android:layout_marginEnd="4dp"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#ECFDF5">
            <TextView
                android:id="@+id/widget_storage"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textStyle="bold"
                android:textColor="#059669" />
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Storage"
                android:textSize="10sp"
                android:textColor="#666666" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:padding="8dp"
            android:background="#FFF7ED">
            <TextView
                android:id="@+id/widget_last_scan"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textStyle="bold"
                android:textColor="#D97706"
                android:maxLines="1"
                android:ellipsize="end" />
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Last Scan"
                android:textSize="10sp"
                android:textColor="#666666" />
        </LinearLayout>
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginVertical="8dp"
        android:background="#E5E7EB" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Recent Documents"
        android:textSize="13sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/widget_empty_state"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="No documents yet\nTap Scan to get started"
        android:textSize="12sp"
        android:textColor="#999999"
        android:gravity="center"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/widget_docs_list"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_marginTop="6dp"
        android:orientation="vertical">

        <LinearLayout android:id="@+id/widget_doc_row_1" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical" android:padding="6dp">
            <TextView android:id="@+id/widget_doc_1_title" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
            <TextView android:id="@+id/widget_doc_1_date" android:layout_width="wrap_content" android:layout_height="wrap_content" android:textSize="10sp" android:textColor="#999999" />
        </LinearLayout>
        <LinearLayout android:id="@+id/widget_doc_row_2" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical" android:padding="6dp">
            <TextView android:id="@+id/widget_doc_2_title" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
            <TextView android:id="@+id/widget_doc_2_date" android:layout_width="wrap_content" android:layout_height="wrap_content" android:textSize="10sp" android:textColor="#999999" />
        </LinearLayout>
        <LinearLayout android:id="@+id/widget_doc_row_3" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical" android:padding="6dp">
            <TextView android:id="@+id/widget_doc_3_title" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
            <TextView android:id="@+id/widget_doc_3_date" android:layout_width="wrap_content" android:layout_height="wrap_content" android:textSize="10sp" android:textColor="#999999" />
        </LinearLayout>
        <LinearLayout android:id="@+id/widget_doc_row_4" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical" android:padding="6dp">
            <TextView android:id="@+id/widget_doc_4_title" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
            <TextView android:id="@+id/widget_doc_4_date" android:layout_width="wrap_content" android:layout_height="wrap_content" android:textSize="10sp" android:textColor="#999999" />
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:orientation="horizontal">

        <Button
            android:id="@+id/widget_scan_button"
            android:layout_width="0dp"
            android:layout_height="36dp"
            android:layout_weight="1"
            android:layout_marginEnd="4dp"
            android:text="Scan"
            android:textSize="12sp"
            android:textColor="#FFFFFF"
            android:backgroundTint="#2563EB" />

        <Button
            android:id="@+id/widget_history_button"
            android:layout_width="0dp"
            android:layout_height="36dp"
            android:layout_weight="1"
            android:layout_marginStart="4dp"
            android:text="History"
            android:textSize="12sp"
            android:backgroundTint="#E5E7EB"
            android:textColor="#374151" />
    </LinearLayout>
</LinearLayout>
`);
}

module.exports = withAndroidWidget;
