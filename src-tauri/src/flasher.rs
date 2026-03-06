use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbDrive {
    pub device: String,
    pub label: String,
    pub size: String,
    pub model: String,
}

#[derive(Clone, Serialize)]
pub struct FlashProgress {
    pub written_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
}

#[tauri::command]
pub async fn list_usb_drives() -> Result<Vec<UsbDrive>, String> {
    #[cfg(target_os = "linux")]
    {
        list_usb_linux().await
    }
    #[cfg(target_os = "windows")]
    {
        list_usb_windows().await
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[cfg(target_os = "linux")]
async fn list_usb_linux() -> Result<Vec<UsbDrive>, String> {
    let output = tokio::process::Command::new("lsblk")
        .args(["-J", "-d", "-o", "NAME,SIZE,TYPE,RM,LABEL,MODEL"])
        .output()
        .await
        .map_err(|e| format!("Failed to run lsblk: {}", e))?;

    if !output.status.success() {
        return Err("lsblk command failed".to_string());
    }

    let json_str =
        String::from_utf8(output.stdout).map_err(|e| format!("Invalid UTF-8 output: {}", e))?;

    #[derive(Deserialize)]
    struct LsblkOutput {
        blockdevices: Vec<LsblkDevice>,
    }

    #[derive(Deserialize)]
    struct LsblkDevice {
        name: String,
        size: Option<String>,
        #[serde(rename = "type")]
        dtype: Option<String>,
        rm: Option<serde_json::Value>,
        label: Option<String>,
        model: Option<String>,
    }

    let parsed: LsblkOutput =
        serde_json::from_str(&json_str).map_err(|e| format!("Failed to parse lsblk: {}", e))?;

    let drives: Vec<UsbDrive> = parsed
        .blockdevices
        .into_iter()
        .filter(|d| {
            let is_disk = d.dtype.as_deref() == Some("disk");
            let is_removable = match &d.rm {
                Some(serde_json::Value::Bool(b)) => *b,
                Some(serde_json::Value::Number(n)) => n.as_u64() == Some(1),
                Some(serde_json::Value::String(s)) => s == "1" || s == "true",
                _ => false,
            };
            is_disk && is_removable
        })
        .map(|d| UsbDrive {
            device: format!("/dev/{}", d.name),
            label: d.label.unwrap_or_else(|| "No label".to_string()),
            size: d.size.unwrap_or_else(|| "Unknown".to_string()),
            model: d.model.unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();

    Ok(drives)
}

#[cfg(target_os = "windows")]
async fn list_usb_windows() -> Result<Vec<UsbDrive>, String> {
    let output = tokio::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            r#"Get-Disk | Where-Object { $_.BusType -eq 'USB' } | ForEach-Object {
                $disk = $_
                [PSCustomObject]@{
                    DeviceID = $disk.Number
                    Model = $disk.FriendlyName
                    Size = [math]::Round($disk.Size / 1GB, 2)
                }
            } | ConvertTo-Json -AsArray"#,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell error: {}", stderr));
    }

    let json_str =
        String::from_utf8(output.stdout).map_err(|e| format!("Invalid UTF-8: {}", e))?;

    if json_str.trim().is_empty() {
        return Ok(Vec::new());
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct WinDisk {
        device_id: u32,
        model: Option<String>,
        size: Option<f64>,
    }

    let disks: Vec<WinDisk> =
        serde_json::from_str(&json_str).map_err(|e| format!("Parse error: {}", e))?;

    Ok(disks
        .into_iter()
        .map(|d| UsbDrive {
            device: format!("\\\\.\\PhysicalDrive{}", d.device_id),
            label: d
                .model
                .clone()
                .unwrap_or_else(|| "USB Drive".to_string()),
            size: format!("{:.1} GB", d.size.unwrap_or(0.0)),
            model: d.model.unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect())
}

#[tauri::command]
pub async fn flash_iso(
    app: AppHandle,
    iso_path: String,
    device: String,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        flash_linux(app, iso_path, device).await
    }
    #[cfg(target_os = "windows")]
    {
        flash_windows(app, iso_path, device).await
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[cfg(target_os = "linux")]
async fn flash_linux(
    app: AppHandle,
    iso_path: String,
    device: String,
) -> Result<(), String> {
    // Get file size for progress
    let metadata = tokio::fs::metadata(&iso_path)
        .await
        .map_err(|e| format!("Cannot read ISO file: {}", e))?;
    let total_bytes = metadata.len();

    // Use pkexec for elevated permissions with dd
    let output = tokio::process::Command::new("pkexec")
        .args([
            "dd",
            &format!("if={}", iso_path),
            &format!("of={}", device),
            "bs=4M",
            "status=progress",
            "oflag=sync",
        ])
        .output()
        .await
        .map_err(|e| format!("Flash command failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // dd writes progress to stderr, so check exit code
        if output.status.code() != Some(0) {
            return Err(format!("Flash failed: {}", stderr));
        }
    }

    // Emit completion
    let _ = app.emit(
        "flash-progress",
        &FlashProgress {
            written_bytes: total_bytes,
            total_bytes,
            percentage: 100.0,
        },
    );

    // Sync to ensure all data is written
    let _ = tokio::process::Command::new("sync").output().await;

    Ok(())
}

#[cfg(target_os = "windows")]
async fn flash_windows(
    app: AppHandle,
    iso_path: String,
    device: String,
) -> Result<(), String> {
    use std::io::{Read, Write, Seek, SeekFrom};

    let iso_path_clone = iso_path.clone();
    let device_clone = device.clone();

    let result = tokio::task::spawn_blocking(move || -> Result<(), String> {
        let mut iso_file = std::fs::File::open(&iso_path_clone)
            .map_err(|e| format!("Cannot open ISO: {}", e))?;
        let total_bytes = iso_file
            .metadata()
            .map_err(|e| format!("Cannot read ISO metadata: {}", e))?
            .len();

        // Open the physical drive for raw writing
        let mut drive = std::fs::OpenOptions::new()
            .write(true)
            .open(&device_clone)
            .map_err(|e| format!("Cannot open drive (run as administrator): {}", e))?;

        let buf_size = 4 * 1024 * 1024; // 4MB buffer
        let mut buffer = vec![0u8; buf_size];
        let mut written: u64 = 0;

        loop {
            let bytes_read = iso_file
                .read(&mut buffer)
                .map_err(|e| format!("Read error: {}", e))?;
            if bytes_read == 0 {
                break;
            }

            drive
                .write_all(&buffer[..bytes_read])
                .map_err(|e| format!("Write error: {}", e))?;
            written += bytes_read as u64;
        }

        drive.flush().map_err(|e| format!("Flush error: {}", e))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?;

    result?;

    let metadata = tokio::fs::metadata(&iso_path)
        .await
        .map_err(|e| format!("Cannot read ISO: {}", e))?;
    let total_bytes = metadata.len();

    let _ = app.emit(
        "flash-progress",
        &FlashProgress {
            written_bytes: total_bytes,
            total_bytes,
            percentage: 100.0,
        },
    );

    Ok(())
}
