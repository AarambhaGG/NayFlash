use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub eta_seconds: f64,
    pub percentage: f64,
}

#[derive(Clone, Serialize)]
pub struct ChecksumResult {
    pub valid: bool,
    pub expected: String,
    pub actual: String,
}

// Global cancel flag
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(&filename);
    let file_path_str = file_path.to_string_lossy().to_string();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3600))
        .user_agent("nayflash/1.0")
        .redirect(reqwest::redirect::Policy::limited(20))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response = client
        .get(&url)
        .header("Accept", "*/*")
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let total_bytes = response.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| format!("Cannot create file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let start_time = std::time::Instant::now();
    let mut last_emit = std::time::Instant::now();

    while let Some(chunk_result) = stream.next().await {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            // Clean up partial file
            drop(file);
            let _ = tokio::fs::remove_file(&file_path).await;
            return Err("Download cancelled".to_string());
        }

        let chunk = chunk_result.map_err(|e| format!("Download stream error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;
        downloaded += chunk.len() as u64;

        // Emit progress every 100ms
        if last_emit.elapsed().as_millis() >= 100 {
            let elapsed = start_time.elapsed().as_secs_f64();
            let speed = if elapsed > 0.0 {
                downloaded as f64 / elapsed
            } else {
                0.0
            };
            let eta = if speed > 0.0 && total_bytes > 0 {
                (total_bytes - downloaded) as f64 / speed
            } else {
                0.0
            };
            let percentage = if total_bytes > 0 {
                (downloaded as f64 / total_bytes as f64) * 100.0
            } else {
                0.0
            };

            let progress = DownloadProgress {
                downloaded_bytes: downloaded,
                total_bytes,
                speed_bps: speed,
                eta_seconds: eta,
                percentage,
            };

            let _ = app.emit("download-progress", &progress);
            last_emit = std::time::Instant::now();
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("File flush error: {}", e))?;

    // Final progress emit
    let _ = app.emit(
        "download-progress",
        &DownloadProgress {
            downloaded_bytes: total_bytes,
            total_bytes,
            speed_bps: 0.0,
            eta_seconds: 0.0,
            percentage: 100.0,
        },
    );

    Ok(file_path_str)
}

#[tauri::command]
pub fn cancel_download() -> Result<(), String> {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn verify_checksum(
    file_path: String,
    expected_hash: String,
) -> Result<ChecksumResult, String> {
    let data = tokio::fs::read(&file_path)
        .await
        .map_err(|e| format!("Cannot read file for checksum: {}", e))?;

    let mut hasher = Sha256::new();
    hasher.update(&data);
    let result = hasher.finalize();
    let actual = hex::encode(result);

    Ok(ChecksumResult {
        valid: actual.to_lowercase() == expected_hash.to_lowercase(),
        expected: expected_hash,
        actual,
    })
}
