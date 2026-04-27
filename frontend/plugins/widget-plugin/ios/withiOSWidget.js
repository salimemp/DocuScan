/**
 * iOS Widget Config Plugin
 * Adds WidgetKit extension target to the Xcode project
 */
const {
  withXcodeProject,
  withInfoPlist,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_EXTENSION_NAME = 'DocScanWidget';
const WIDGET_BUNDLE_ID_SUFFIX = '.widget';

function withiOSWidget(config) {
  // Step 1: Add App Group entitlement for shared data
  config = withEntitlementsPlist(config, (mod) => {
    const bundleId = mod.modResults['application-identifier'] ||
      config.ios?.bundleIdentifier || 'com.docscanpro.app';
    const appGroup = `group.${config.ios?.bundleIdentifier || 'com.docscanpro.app'}`;
    
    mod.modResults['com.apple.security.application-groups'] = [
      appGroup,
    ];
    return mod;
  });

  // Step 2: Configure Info.plist
  config = withInfoPlist(config, (mod) => {
    // Enable widget support
    mod.modResults['NSWidgetWantsLocation'] = false;
    return mod;
  });

  // Step 3: Add widget extension to Xcode project
  config = withXcodeProject(config, async (mod) => {
    const project = mod.modResults;
    const bundleId = config.ios?.bundleIdentifier || 'com.docscanpro.app';
    const widgetBundleId = `${bundleId}${WIDGET_BUNDLE_ID_SUFFIX}`;
    const appGroup = `group.${bundleId}`;
    const targetName = WIDGET_EXTENSION_NAME;
    const platformProjectRoot = mod.modRequest.platformProjectRoot;
    
    // Create widget extension directory
    const widgetDir = path.join(platformProjectRoot, targetName);
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    // Write Swift source files
    writeWidgetSwiftFiles(widgetDir, appGroup, bundleId);
    
    // Write widget entitlements
    const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroup}</string>
  </array>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, `${targetName}.entitlements`), entitlementsContent);

    // Write Info.plist for widget extension
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>DocScan Pro Widget</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>${widgetBundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, `${targetName}-Info.plist`), widgetInfoPlist);

    // Add widget target to Xcode project
    try {
      const targetUuid = project.generateUuid();
      const groupName = targetName;
      
      // Add a new PBXNativeTarget for the widget extension
      const target = project.addTarget(
        targetName,
        'app_extension',
        targetName,
        widgetBundleId
      );
      
      if (target) {
        // Add source files to the target
        const sourceFiles = [
          'DocScanWidgetBundle.swift',
          'QuickScanWidget.swift',
          'RecentDocsWidget.swift',
          'DashboardWidget.swift',
          'WidgetDataProvider.swift',
        ];
        
        const groupKey = project.addPbxGroup(
          sourceFiles.map(f => path.join(targetName, f)),
          targetName,
          targetName
        );
        
        // Add build settings
        const configurations = project.pbxXCBuildConfigurationSection();
        for (const key in configurations) {
          if (typeof configurations[key] === 'object' && 
              configurations[key].buildSettings &&
              configurations[key].name) {
            const settings = configurations[key].buildSettings;
            if (settings.PRODUCT_NAME === `"${targetName}"` || 
                settings.PRODUCT_BUNDLE_IDENTIFIER === widgetBundleId) {
              settings.SWIFT_VERSION = '5.0';
              settings.TARGETED_DEVICE_FAMILY = '"1,2"';
              settings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
              settings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
              settings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground';
            }
          }
        }
      }
    } catch (e) {
      console.warn('[DocScanWidget] Could not add widget target to Xcode project:', e.message);
    }

    return mod;
  });

  return config;
}

function writeWidgetSwiftFiles(widgetDir, appGroup, bundleId) {
  const fs = require('fs');

  // 1. Widget Bundle (entry point)
  fs.writeFileSync(path.join(widgetDir, 'DocScanWidgetBundle.swift'), `//
//  DocScanWidgetBundle.swift
//  DocScan Pro Widget
//

import WidgetKit
import SwiftUI

@main
struct DocScanWidgetBundle: WidgetBundle {
    var body: some Widget {
        QuickScanWidget()
        RecentDocsWidget()
        DashboardWidget()
    }
}
`);

  // 2. Widget Data Provider (shared data layer)
  fs.writeFileSync(path.join(widgetDir, 'WidgetDataProvider.swift'), `//
//  WidgetDataProvider.swift
//  DocScan Pro Widget
//

import Foundation
import WidgetKit

struct DocScanWidgetData: Codable {
    let totalScans: Int
    let lastScanDate: String?
    let storageUsed: String
    let recentDocuments: [RecentDocument]
    let userName: String?
    let subscriptionTier: String
    
    struct RecentDocument: Codable, Identifiable {
        let id: String
        let title: String
        let thumbnail: String?
        let date: String
    }
    
    static let placeholder = DocScanWidgetData(
        totalScans: 42,
        lastScanDate: "2 hours ago",
        storageUsed: "128 MB",
        recentDocuments: [
            RecentDocument(id: "1", title: "Invoice #2024", thumbnail: nil, date: "Today"),
            RecentDocument(id: "2", title: "Receipt - Coffee", thumbnail: nil, date: "Yesterday"),
            RecentDocument(id: "3", title: "Contract Draft", thumbnail: nil, date: "2 days ago"),
        ],
        userName: "User",
        subscriptionTier: "Pro"
    )
    
    static let empty = DocScanWidgetData(
        totalScans: 0,
        lastScanDate: nil,
        storageUsed: "0 KB",
        recentDocuments: [],
        userName: nil,
        subscriptionTier: "free"
    )
}

class WidgetDataProvider {
    static let shared = WidgetDataProvider()
    private let appGroup = "${appGroup}"
    private let dataKey = "widgetData"
    
    func getData() -> DocScanWidgetData {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup),
              let data = sharedDefaults.data(forKey: dataKey),
              let widgetData = try? JSONDecoder().decode(DocScanWidgetData.self, from: data)
        else {
            return .empty
        }
        return widgetData
    }
    
    func saveData(_ data: DocScanWidgetData) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup),
              let encoded = try? JSONEncoder().encode(data)
        else { return }
        sharedDefaults.set(encoded, forKey: dataKey)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

// Timeline Provider for widgets
struct DocScanTimelineEntry: TimelineEntry {
    let date: Date
    let data: DocScanWidgetData
}

struct DocScanTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> DocScanTimelineEntry {
        DocScanTimelineEntry(date: Date(), data: .placeholder)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DocScanTimelineEntry) -> Void) {
        let data = WidgetDataProvider.shared.getData()
        completion(DocScanTimelineEntry(date: Date(), data: data))
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DocScanTimelineEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getData()
        let entry = DocScanTimelineEntry(date: Date(), data: data)
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
`);

  // 3. Quick Scan Widget (Small - 2x2)
  fs.writeFileSync(path.join(widgetDir, 'QuickScanWidget.swift'), `//
//  QuickScanWidget.swift
//  DocScan Pro Widget - Small Size
//

import WidgetKit
import SwiftUI

struct QuickScanWidget: Widget {
    let kind: String = "QuickScanWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DocScanTimelineProvider()) { entry in
            QuickScanWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Quick Scan")
        .description("One-tap access to scan documents")
        .supportedFamilies([.systemSmall])
    }
}

struct QuickScanWidgetView: View {
    var entry: DocScanTimelineEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "doc.viewfinder")
                    .font(.title2)
                    .foregroundColor(.blue)
                Spacer()
                Text("\(entry.data.totalScans)")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
            }
            
            Text("DocScan Pro")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Link(destination: URL(string: "docscanpro://scan")!) {
                HStack {
                    Image(systemName: "camera.fill")
                        .font(.caption)
                    Text("Scan")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
        }
        .padding()
    }
}
`);

  // 4. Recent Documents Widget (Medium - 4x2)
  fs.writeFileSync(path.join(widgetDir, 'RecentDocsWidget.swift'), `//
//  RecentDocsWidget.swift
//  DocScan Pro Widget - Medium Size
//

import WidgetKit
import SwiftUI

struct RecentDocsWidget: Widget {
    let kind: String = "RecentDocsWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DocScanTimelineProvider()) { entry in
            RecentDocsWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Recent Documents")
        .description("Quick access to your recent scans")
        .supportedFamilies([.systemMedium])
    }
}

struct RecentDocsWidgetView: View {
    var entry: DocScanTimelineEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "doc.viewfinder")
                    .font(.caption)
                    .foregroundColor(.blue)
                Text("DOCSCAN PRO")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                Spacer()
                Link(destination: URL(string: "docscanpro://scan")!) {
                    Image(systemName: "camera.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            
            Text("Recent Documents")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            if entry.data.recentDocuments.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "doc.text")
                            .font(.title3)
                            .foregroundColor(.secondary)
                        Text("No documents yet")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                HStack(spacing: 8) {
                    ForEach(entry.data.recentDocuments.prefix(3)) { doc in
                        Link(destination: URL(string: "docscanpro://document/\(doc.id)")!) {
                            VStack(spacing: 4) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color.blue.opacity(0.1))
                                    .frame(height: 40)
                                    .overlay(
                                        Image(systemName: "doc.text")
                                            .font(.caption)
                                            .foregroundColor(.blue)
                                    )
                                Text(doc.title)
                                    .font(.caption2)
                                    .lineLimit(1)
                                    .foregroundColor(.primary)
                            }
                        }
                    }
                }
            }
        }
        .padding()
    }
}
`);

  // 5. Dashboard Widget (Large - 4x4)
  fs.writeFileSync(path.join(widgetDir, 'DashboardWidget.swift'), `//
//  DashboardWidget.swift
//  DocScan Pro Widget - Large Size
//

import WidgetKit
import SwiftUI

struct DashboardWidget: Widget {
    let kind: String = "DashboardWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DocScanTimelineProvider()) { entry in
            DashboardWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Document Dashboard")
        .description("Full dashboard with stats and recent documents")
        .supportedFamilies([.systemLarge])
    }
}

struct DashboardWidgetView: View {
    var entry: DocScanTimelineEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack {
                Image(systemName: "doc.viewfinder")
                    .font(.title3)
                    .foregroundColor(.blue)
                Text("DocScan Pro")
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
                if let tier = entry.data.subscriptionTier.isEmpty ? nil : entry.data.subscriptionTier,
                   tier != "free" {
                    Text(tier.uppercased())
                        .font(.caption2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(4)
                        .foregroundColor(.blue)
                }
            }
            
            // Stats Row
            HStack(spacing: 16) {
                StatCard(title: "Total Scans", value: "\(entry.data.totalScans)", icon: "doc.text.fill", color: .blue)
                StatCard(title: "Storage", value: entry.data.storageUsed, icon: "internaldrive.fill", color: .green)
                StatCard(title: "Last Scan", value: entry.data.lastScanDate ?? "Never", icon: "clock.fill", color: .orange)
            }
            
            Divider()
            
            // Recent Documents
            Text("Recent Documents")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            if entry.data.recentDocuments.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "doc.text")
                            .font(.title2)
                            .foregroundColor(.secondary)
                        Text("No documents yet")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Tap to start scanning")
                            .font(.caption2)
                            .foregroundColor(.tertiary)
                    }
                    .padding(.vertical, 12)
                    Spacer()
                }
            } else {
                VStack(spacing: 6) {
                    ForEach(entry.data.recentDocuments.prefix(4)) { doc in
                        Link(destination: URL(string: "docscanpro://document/\(doc.id)")!) {
                            HStack(spacing: 10) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color.blue.opacity(0.1))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Image(systemName: "doc.text")
                                            .font(.caption)
                                            .foregroundColor(.blue)
                                    )
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(doc.title)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .lineLimit(1)
                                        .foregroundColor(.primary)
                                    Text(doc.date)
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption2)
                                    .foregroundColor(.tertiary)
                            }
                        }
                    }
                }
            }
            
            Spacer()
            
            // Quick Actions
            HStack(spacing: 12) {
                Link(destination: URL(string: "docscanpro://scan")!) {
                    HStack {
                        Image(systemName: "camera.fill")
                            .font(.caption)
                        Text("Scan")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                
                Link(destination: URL(string: "docscanpro://history")!) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .font(.caption)
                        Text("History")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.2))
                    .foregroundColor(.primary)
                    .cornerRadius(8)
                }
            }
        }
        .padding()
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.08))
        .cornerRadius(8)
    }
}
`);
}

module.exports = withiOSWidget;
