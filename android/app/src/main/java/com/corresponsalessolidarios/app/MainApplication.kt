package com.corresponsalessolidarios.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

/** Debe coincidir con el host de [services/ApiService.js] BASE_URL (sin esquema ni puerto). */
private const val API_BACKEND_HOST = "186.101.59.140"

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(MyReactNativePackage())
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // Certificado TLS autofirmado (CN localhost) accedido por IP: OkHttp verificaría el nombre.
    // network_security_config confía en el PEM embebido; aquí solo se acepta el hostname de la IP del API.
    OkHttpClientProvider.setOkHttpClientFactory(
        OkHttpClientFactory {
          OkHttpClientProvider.createClientBuilder(this@MainApplication)
              .hostnameVerifier { hostname, _ -> hostname == API_BACKEND_HOST }
              .build()
        })
    try {
      SoLoader.init(this, OpenSourceMergedSoMapping)
      if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
        // If you opted-in for the New Architecture, we load the native entry point for this app.
        load()
      }
      ApplicationLifecycleDispatcher.onApplicationCreate(this)
    } catch (e: Exception) {
      android.util.Log.e("MainApplication", "Error en onCreate", e)
      e.printStackTrace()
      throw e
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
