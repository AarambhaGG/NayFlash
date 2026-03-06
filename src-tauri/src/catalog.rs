use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog {
    pub version: u32,
    pub distros: Vec<Distro>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Distro {
    pub id: String,
    pub name: String,
    pub description: String,
    pub url: String,
    pub checksum_sha256: String,
    pub size_gb: f64,
    pub icon_url: String,
}

const CATALOG_URL: &str =
    "https://raw.githubusercontent.com/yourname/nayflash-catalog/main/catalog.json";

const FALLBACK_CATALOG: &str = include_str!("../../src/catalog.json");

#[tauri::command]
pub async fn fetch_catalog() -> Result<Catalog, String> {
    // Try fetching from remote
    match fetch_remote_catalog().await {
        Ok(catalog) => Ok(catalog),
        Err(e) => {
            eprintln!("Failed to fetch remote catalog: {}. Using fallback.", e);
            parse_fallback_catalog()
        }
    }
}

async fn fetch_remote_catalog() -> Result<Catalog, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response = client
        .get(CATALOG_URL)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    serde_json::from_str::<Catalog>(&text).map_err(|e| format!("Parse error: {}", e))
}

fn parse_fallback_catalog() -> Result<Catalog, String> {
    serde_json::from_str::<Catalog>(FALLBACK_CATALOG)
        .map_err(|e| format!("Fallback catalog parse error: {}", e))
}
