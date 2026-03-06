mod catalog;
mod downloader;
mod flasher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            catalog::fetch_catalog,
            downloader::start_download,
            downloader::cancel_download,
            downloader::verify_checksum,
            flasher::list_usb_drives,
            flasher::flash_iso,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NayFlash");
}
