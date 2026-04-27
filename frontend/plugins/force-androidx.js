/**
 * Expo Config Plugin: Force AndroidX Resolution
 *
 * Excludes legacy `com.android.support` dependencies that conflict with AndroidX.
 * Specifically targets duplicate class errors caused by libraries (like
 * @react-native-voice/voice) that ship old support libraries.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const RESOLUTION_BLOCK = `
// === Force AndroidX (injected by force-androidx plugin) ===
android {
    packagingOptions {
        resources {
            pickFirsts += [
                "META-INF/androidx.*",
                "META-INF/*.version",
                "META-INF/*.kotlin_module",
                "META-INF/*.properties",
                "META-INF/proguard/**",
                "META-INF/services/**",
                "META-INF/INDEX.LIST",
                "META-INF/io.netty.versions.properties",
                "META-INF/DEPENDENCIES"
            ]
            excludes += [
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/license.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/notice.txt",
                "META-INF/ASL2.0",
                "META-INF/*.SF",
                "META-INF/*.DSA",
                "META-INF/*.RSA"
            ]
        }
    }
}

configurations.all {
    resolutionStrategy {
        force "androidx.core:core:1.16.0"
        force "androidx.core:core-ktx:1.16.0"
        force "androidx.versionedparcelable:versionedparcelable:1.1.1"
    }
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'support-media-compat'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'versionedparcelable'
    exclude group: 'com.android.support', module: 'support-annotations'
}
// === End force-androidx ===
`;

function withForceAndroidX(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (contents.includes('// === force-androidx plugin ===') ||
        contents.includes('=== Force AndroidX')) {
      return mod;
    }

    // Append at the end of the file (after android {} block & dependencies {})
    contents = contents.trimEnd() + '\n' + RESOLUTION_BLOCK + '\n';

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withForceAndroidX;
