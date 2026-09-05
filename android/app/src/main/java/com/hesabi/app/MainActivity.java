package com.hesabi.app;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins must be registered before super.onCreate() so the bridge
        // picks them up when it is created inside super.onCreate().
        registerPlugin(HesabiScannerPlugin.class);
        registerPlugin(HesabiContactsPlugin.class);
        registerPlugin(HesabiFilesPlugin.class);
        registerPlugin(HesabiAppPlugin.class);
        super.onCreate(savedInstanceState);

        // Route the hardware back button into the WebView history so the
        // app's popstate-based exit guard decides what happens: close an
        // overlay, or show the exit confirmation dialog. The web layer calls
        // HesabiApp.exitApp() when the user confirms the exit.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                android.webkit.WebView webView = null;
                if (getBridge() != null) {
                    webView = getBridge().getWebView();
                }
                if (webView == null) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    return;
                }
                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                // No history entries left: wake the exit guard in the page so
                // it can show the confirmation dialog (or exit if allowed).
                webView.evaluateJavascript(
                    "window.dispatchEvent(new PopStateEvent('popstate'));",
                    null);
            }
        });
    }
}
