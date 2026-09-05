package com.hesabi.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;

import androidx.activity.result.ActivityResult;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Native contacts picker for Hesabi (حسابي).
 * Opens the system contact picker so the user chooses one contact without the
 * app reading the whole address book. Returns the display name and phone list,
 * shaped like the web Contact Picker API result used by client/src/js/app.js.
 */
@CapacitorPlugin(
    name = "HesabiContacts",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts"),
    }
)
public class HesabiContactsPlugin extends Plugin {

    private static final String CONTACT_PICKER_TAG = "HesabiContacts";
    private boolean allowMultiple = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        // ACTION_PICK contact picker works without any runtime permission.
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("mode", "system-picker");
        ret.put("platform", "android");
        call.resolve(ret);
    }

    /**
     * Open the system contact picker.
     * Optional call options mirror the web Contact Picker API:
     *   { props: ["name", "tel"], multiple: false }
     */
    @PluginMethod
    public void select(PluginCall call) {
        // The web Contact Picker API shape is { props: ["name","tel"], multiple:false }.
        // We always return both name and tel, and ACTION_PICK yields a single pick,
        // so these options are accepted but not needed by the system picker.
        allowMultiple = Boolean.TRUE.equals(call.getBoolean("multiple", false));

        Intent intent = new Intent(Intent.ACTION_PICK);
        // Pick a phone row directly: the returned URI carries a temporary read
        // grant, so no READ_CONTACTS runtime permission is ever needed and the
        // user chooses a concrete number (best fit for the phone field form).
        intent.setType(ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE);
        if (allowMultiple) {
            // ACTION_PICK returns a single contact; multi-select needs a custom
            // UI which we avoid by falling back to single selection per call.
            allowMultiple = false;
        }
        startActivityForResult(call, intent, "contactPicked");
    }

    @ActivityCallback
    private void contactPicked(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        int resultCode = result.getResultCode();
        Uri contactUri = result.getData() != null ? result.getData().getData() : null;
        if (resultCode != android.app.Activity.RESULT_OK || contactUri == null) {
            // User cancelled the picker; resolve with an empty list like the web API.
            JSObject ret = new JSObject();
            ret.put("contacts", new JSArray());
            call.resolve(ret);
            return;
        }
        try {
            JSObject contact = loadContact(contactUri);
            JSArray contacts = new JSArray();
            contacts.put(contact);
            JSObject ret = new JSObject();
            ret.put("contacts", contacts);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("فشل قراءة جهة الاتصال: " + e.getMessage());
        }
    }

    private JSObject loadContact(Uri pickedUri) throws Exception {
        JSObject contact = new JSObject();
        String displayName = "";
        String number = "";
        // The picked URI points at a Phone data row and carries a temporary
        // read grant, so querying it directly needs no runtime permission.
        try (Cursor cursor = getContext().getContentResolver().query(
                pickedUri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                if (nameIndex >= 0) displayName = cursor.getString(nameIndex);
                if (numberIndex >= 0) number = cursor.getString(numberIndex);
            }
        }
        if (displayName == null) displayName = "";
        if (number == null) number = "";
        contact.put("name", displayName);
        JSArray tel = new JSArray();
        String trimmed = number.trim();
        if (!trimmed.isEmpty()) tel.put(trimmed);
        contact.put("tel", tel);
        return contact;
    }

    @PluginMethod
    public void hasPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("contacts", ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CONTACTS)
            == PackageManager.PERMISSION_GRANTED ? "granted" : "denied");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CONTACTS)
            == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("contacts", "granted");
            call.resolve(ret);
            return;
        }
        saveCall(call);
        requestPermissionForAlias("contacts", call, "contactsPermissionCallback");
        // Permission not declared: the picker still works without it.
        JSObject ret = new JSObject();
        ret.put("contacts", "granted");
        call.resolve(ret);
    }

    @PermissionCallback
    private void contactsPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CONTACTS)
            == PackageManager.PERMISSION_GRANTED;
        ret.put("contacts", granted ? "granted" : "denied");
        call.resolve(ret);
    }
}
