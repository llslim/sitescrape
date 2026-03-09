#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);

const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));
const url = nonFlagArgs[0] || 'http://localhost:3000';
const tableSelector = nonFlagArgs[1] || 'table';

function CleanEmptyArrayValue(data) {
    if (!Array.isArray(data)) return [];
    return data.map(row => {
        if (!Array.isArray(row)) return row;
        return row.filter(cell => cell && cell.trim() !== '');
    });
}

function cleanData(data) {
    if (!Array.isArray(data)) return [];
    return data.filter(row => {
        // Filter out non-array rows (just in case)
        if (!Array.isArray(row)) return false;
        // Filter out rows where every cell is empty or whitespace
        const isEmpty = row.every(cell => !cell || cell.trim() === '');
        return !isEmpty;
    });
}

function getAssetCategory(url) {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();

    if (pathname.endsWith('.pdf') || pathname.endsWith('.doc') || pathname.endsWith('.docx')) {
        return 'documents';
    }
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tif', '.tiff'];
    if (imageExts.some(ext => pathname.endsWith(ext))) {
        return 'images';
    }
    return null;
}

async function buildSitemap(browser, startUrl) {
    const visited = new Set();
    const queue = [startUrl];
    const sitemap = [];
    const assets = { documents: [], images: [] };
    const origin = new URL(startUrl).origin;

    const page = await browser.newPage();

    while (queue.length > 0) {
        const currentUrl = queue.shift();
        if (visited.has(currentUrl)) continue;

        visited.add(currentUrl);

        const assetCategory = getAssetCategory(currentUrl);
        if (assetCategory) {
            assets[assetCategory].push(currentUrl);
            continue;
        }

        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle0' });

            sitemap.push(currentUrl);

            const links = await page.evaluate((origin) => {
                return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.startsWith(origin));
            }, origin);

            for (const link of links) {
                // Simple normalization: remove hash
                const u = new URL(link);
                u.hash = '';
                const normalized = u.href;
                
                if (!visited.has(normalized) && !queue.includes(normalized)) {
                    queue.push(normalized);
                }
            }
        } catch (e) {
            console.error(`Error crawling ${currentUrl}: ${e.message}`);
        }
    }
    await page.close();
    return { sitemap, assets };
}

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Use process.cwd() so the data is saved in the directory where the command is run
    const outputDir = path.join(process.cwd(), 'scraped_data');
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }

    console.log(`Building sitemap starting from ${url}...`);
    const { sitemap, assets } = await buildSitemap(browser, url);
    console.log(`Found ${sitemap.length} pages.`);

    const sitemapData = [];
    const page = await browser.newPage();

    for (const pageUrl of sitemap) {
        console.log(`Scraping ${pageUrl}...`);
        let content = [];
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle0' });
            
            // Check if table exists quickly
            const tableExists = await page.$(tableSelector);
            if (tableExists) {
                const rawData = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    if (!table) return null;
                    const rows = Array.from(table.querySelectorAll('tr'));
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('th, td'));
                        return cells.map(cell => cell.innerText.trim());
                    });
                }, tableSelector);

                if (rawData) {
                    const cleanedValues = CleanEmptyArrayValue(rawData);
                    content = cleanData(cleanedValues);
                }
            }
        } catch (e) {
            console.error(`Error scraping ${pageUrl}: ${e.message}`);
        }

        sitemapData.push({
            name: pageUrl,
            content: content
        });
    }

    const output = { sitemap: sitemapData, assets };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `site-data-${timestamp}.json`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Data saved to ${outputPath}`);

    await browser.close();
})();