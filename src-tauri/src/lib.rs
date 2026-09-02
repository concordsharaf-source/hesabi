use tauri::{menu::{Menu, MenuItem, Submenu}, Emitter, Manager};

#[tauri::command]
fn desktop_app_name() -> &'static str { "حسابي" }

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![desktop_app_name])
        .setup(|app| {
            let file = Submenu::with_items(app, "ملف", true, &[
                &MenuItem::with_id(app, "new-sale", "فاتورة بيع جديدة", true, Some("Ctrl+N"))?,
                &MenuItem::with_id(app, "new-purchase", "فاتورة شراء جديدة", true, Some("Ctrl+Shift+N"))?,
                &MenuItem::with_id(app, "backup", "تصدير نسخة احتياطية", true, None::<&str>)?,
                &MenuItem::with_id(app, "restore", "استيراد نسخة احتياطية", true, None::<&str>)?,
                &MenuItem::with_id(app, "quit", "خروج", true, Some("Alt+F4"))?,
            ])?;
            let sales = Submenu::with_items(app, "المبيعات", true, &[
                &MenuItem::with_id(app, "sales", "فواتير البيع", true, Some("F4"))?,
                &MenuItem::with_id(app, "customers", "العملاء والديون", true, None::<&str>)?,
            ])?;
            let purchases = Submenu::with_items(app, "المشتريات", true, &[
                &MenuItem::with_id(app, "purchases", "فواتير الشراء", true, Some("F6"))?,
                &MenuItem::with_id(app, "inventory", "المخزون", true, None::<&str>)?,
            ])?;
            let reports = Submenu::with_items(app, "التقارير", true, &[
                &MenuItem::with_id(app, "reports", "التقارير التشغيلية", true, None::<&str>)?,
                &MenuItem::with_id(app, "print", "طباعة / تصدير PDF", true, Some("Ctrl+P"))?,
            ])?;
            let settings = Submenu::with_items(app, "الإعدادات", true, &[
                &MenuItem::with_id(app, "settings", "مركز الإعدادات", true, None::<&str>)?,
                &MenuItem::with_id(app, "general-settings", "بيانات المتجر", true, None::<&str>)?,
            ])?;
            let menu = Menu::with_items(app, &[&file, &sales, &purchases, &reports, &settings])?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if event.id().as_ref() == "quit" { app.exit(0); return; }
                if let Some(window) = app.get_webview_window("main") {
                    let command = event.id().as_ref().to_string();
                    let _ = window.emit("desktop-command", command);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Hesabi desktop application");
}
