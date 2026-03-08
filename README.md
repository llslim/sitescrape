# SiteScrape

A CLI tool to crawl a website, build a sitemap, and scrape HTML tables from each page into a JSON file.

## Installation

To install this tool globally on your system:

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

Once installed, you can run `sitescrape` from any directory. The scraped data will be saved in a `scraped_data` folder within your current working directory.

```bash
sitescrape <url> [tableSelector]
```

### Arguments

- `url`: The starting URL to crawl (default: `http://localhost:3000`)
- `tableSelector`: The CSS selector for the table to scrape (default: `table`)

### Example

```bash
sitescrape https://example.com .data-table
```