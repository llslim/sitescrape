# SiteScrape

A CLI tool to crawl a website, build a sitemap, and scrape HTML tables from each page into formatted HTML files, with optional JSON and Google Docs export.

## Installation

1. Navigate to the project directory:
   ```bash
   cd /home/<user>/web/projects/sitescrape
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Link the package globally:
   ```bash
   npm link
   ```

## Usage

```bash
sitescrape <url> [tableSelector] [flags]
```

### Arguments

- `url`: The starting URL to crawl (default: `http://localhost:3000`)
- `tableSelector`: The CSS selector for the table to scrape (default: `table`)

### Flags

- `--json`: Save a combined JSON file of all scraped data.
- `--google-doc`: Automatically upload and convert each scraped page into a Google Doc. (Requires `service-account.json`)

### Example

```bash
sitescrape https://example.com .data-table --json --google-doc
```

## Output

All data is saved in a timestamped directory under `scraped_data/`:

- **HTML Files:** Each page containing a table is saved as a separate `.html` file.
- **Frontmatter:** Every HTML table includes a header row with the Page Title, Source URL, and Scrape Date.
- **JSON (Optional):** A `full-data.json` file containing all content and asset links.
- **Google Docs (Optional):** Native Google Documents created in your Google Drive.

## Google Drive Setup

To use the `--google-doc` feature:
1. Create a Google Cloud Project and enable the **Google Drive API**.
2. Create a **Service Account** and download the JSON key as `service-account.json`.
3. Save the key in the project root.
4. Share a Google Drive folder with the `client_email` found in your service account key.
