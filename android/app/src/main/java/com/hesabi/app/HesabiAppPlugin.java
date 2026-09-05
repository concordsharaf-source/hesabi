package com.hesabi.app;

import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * App-level helpers for Hesabi.
 * Capacitor 8.5.0 has no bundled App plugin, so this provides exitApp()
 * used by the exit-confirmation flow in client/src/js/app.js.
 */
@CapacitorPlugin(name = "HesabiApp")
public class HesabiAppPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("platform", "android");
        ret.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    /**
     * Exit the app after the user confirms the exit dialog.
     */
    @PluginMethod
    public void exitApp(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("exiting", true);
        call.resolve(ret);
        if (getActivity() != null) {
            getActivity().finishAffinity();
        }
    }

    /**
     * Minimize the app instead of killing it.
     */
    @PluginMethod
    public void minimizeApp(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("minimized", true);
        call.resolve(ret);
        try {
            android.content.Intent home = new android.content.Intent(
                android.content.Intent.ACTION_MAIN);
            home.addCategory(android.content.Intent.CATEGORY_HOME);
            home.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(home);
        } catch (Exception ignored) {
        }
    }
}
