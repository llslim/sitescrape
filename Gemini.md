# SiteScrape Project Context

## Overview
This project is a Node.js CLI tool designed to crawl a website and scrape content from HTML tables. It was evolved from a simple table scraper script into a full site crawler.

## Key Features
1. **Sitemap Generation**: Crawls the website starting from a given URL to build a list of all internal pages.
2. **Advanced Table Scraping**: 
   - Visits each page and extracts table content using `innerHTML` to preserve text formatting and link tags.
   - Normalizes all link `href` attributes to absolute URLs for portability.
   - Captures the **Page Title** for each scraped document.
3. **Organized HTML Output**: 
   - Generates a dedicated, timestamped directory for each scraping session.
   - Saves each scraped page as an individual `.html` file.
   - **Frontmatter**: Each HTML table includes a specialized header row with the Page Title, Source URL, and Scrape Date.
4. **Optional Exports**:
   - `--json`: Generates a `full-data.json` file with all content and assets.
   - `--google-doc`: Automatically uploads each page to Google Drive and converts it into a native Google Document (requires `service-account.json`).
5. **Asset Indexing**: Indexes URLs of non-HTML content (images, PDFs, Word docs, TXT) into the output, organizing them by type.
6. **Data Cleaning**: 
   - Removes empty array values within rows.
   - Removes completely empty rows.

## File Structure
- `index.mjs`: The main executable script.
- `service-account.json`: (Optional) Google Cloud service account key for Drive automation.
- `scraped_data/`: Root directory for all scraping sessions.
- `package.json`: Defines dependencies and the `sitescrape` bin command.
- `README.md`: Detailed usage and setup instructions.

## Development History
- Started as a single page table scraper.
- Added data cleaning functions (`CleanEmptyArrayValue`, `cleanData`).
- Added `buildSitemap` function to crawl the site.
- Converted to a CLI tool for global usage.
- Added asset scraping and indexing features.
- Implemented `innerHTML` scraping to preserve links and formatting.
- Added HTML report generation and frontmatter (Page Title, URL, Date).
- Implemented automated Google Drive upload and Doc conversion.
- Refactored output into session-based directories with optional format flags.