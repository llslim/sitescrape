# SiteScrape Project Context

## Overview
This project is a Node.js CLI tool designed to crawl a website and scrape content from HTML tables. It was evolved from a simple table scraper script into a full site crawler.

## Key Features
1. **Sitemap Generation**: Crawls the website starting from a given URL to build a list of all internal pages.
2. **Table Scraping**: Visits each page in the sitemap and looks for a specific HTML table (configurable via selector).
3. **Data Cleaning**: 
   - Removes empty array values within rows.
   - Removes completely empty rows.
4. **JSON Output**: Saves the scraped data into a structured JSON file containing the sitemap and the content for each page.

## File Structure
- `index.mjs`: The main executable script (formerly `sitescrape.mjs`).
- `package.json`: Defines the project dependencies and the `sitescrape` bin command.
- `README.md`: Usage instructions.

## Development History
- Started as a single page table scraper.
- Added data cleaning functions (`CleanEmptyArrayValue`, `cleanData`).
- Added `buildSitemap` function to crawl the site.
- Converted to a CLI tool for global usage.