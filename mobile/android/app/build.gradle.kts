plugins {
    id("com.android.application")
    // Plugin que lee `google-services.json` para registrar FCM/Analytics.
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "ar.com.nareapp.nareapp_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Requerido por flutter_local_notifications para usar APIs de
        // java.time en minSdk anteriores a 26.
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "ar.com.nareapp.nareapp_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        // API key de Google Maps SDK for Android. Se inyecta en el manifest
        // (meta-data com.google.android.geo.API_KEY). Formas de pasarla:
        //   flutter build apk -P MAPS_API_KEY=AIza...
        //   MAPS_API_KEY=AIza... flutter build apk
        // Sin valor, el mapa carga pero queda gris con la marca
        // "For development purposes only" (síntoma de key faltante).
        // Pasos para habilitar la API: ver docs/MAPS-SETUP.md.
        manifestPlaceholders["MAPS_API_KEY"] =
            project.findProperty("MAPS_API_KEY") as String?
                ?: System.getenv("MAPS_API_KEY")
                ?: ""
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
