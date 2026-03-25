#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const args = process.argv.slice(2);
const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'service-account.json');

// Parse flags
const isJsonEnabled = args.includes('--json');
const isGoogleDocEnabled = args.includes('--google-doc');
const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));

const url = nonFlagArgs[0] || 'http://localhost:3000';
const tableSelector = nonFlagArgs[1] || 'table';

async function uploadToDrive(filePath, fileName) {
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
        console.warn('Skipping Google Drive upload: service-account.json not found.');
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Convert to Google Doc
    };

    const media = {
        mimeType: 'text/html',
        body: fs.createReadStream(filePath),
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink',
        });
        console.log(`Uploaded to Google Drive: ${response.data.name} -> ${response.data.webViewLink}`);
        return response.data;
    } catch (err) {
        console.error(`Error uploading ${fileName} to Drive:`, err.message);
    }
}

function generatePageHtml(pageUrl, pageTitle, content) {
    const timestamp = new Date().toLocaleString();
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${pageTitle || 'Scraped Page'}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
        .frontmatter { background-color: #2c3e50; color: white; font-weight: bold; padding: 15px; }
        .header { background-color: #f2f2f2; font-weight: bold; }
        a { color: #3498db; text-decoration: none; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td colspan="100%" class="frontmatter">
                PAGE TITLE: ${pageTitle || 'N/A'}<br>
                SOURCE URL: ${pageUrl}<br>
                SCRAPE DATE: ${timestamp}
            </td>
        </tr>`;

    content.forEach((row, index) => {
        htmlContent += '\n  <tr>';
        row.forEach(cell => {
            const className = index === 0 ? 'header' : '';
            htmlContent += `\n    <td class="${className}">${cell}</td>`;
        });
        htmlContent += '\n  </tr>';
    });

    htmlContent += '\n</table>\n</body>\n</html>';
    return htmlContent;
}

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
        if (!Array.isArray(row)) return false;
        const isEmpty = row.every(cell => !cell || cell.trim() === '');
        return !isEmpty;
    });
}

function getAssetCategory(url) {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    if (pathname.endsWith('.pdf') || pathname.endsWith('.doc') || pathname.endsWith('.docx') || pathname.endsWith('.txt')) {
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

    const urlObj = new URL(url);
    const siteName = urlObj.hostname.replace(/\./g, '-');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create dedicated session directory
    const sessionDir = path.join(process.cwd(), 'scraped_data', `${siteName}-${timestampStr}`);
    if (!fs.existsSync(sessionDir)){
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log(`Building sitemap starting from ${url}...`);
    const { sitemap, assets } = await buildSitemap(browser, url);
    console.log(`Found ${sitemap.length} pages.`);

    const sitemapData = [];
    const page = await browser.newPage();

    for (const pageUrl of sitemap) {
        console.log(`Scraping ${pageUrl}...`);
        let content = [];
        let pageTitle = '';
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle0' });
            pageTitle = await page.title();
            
            const tableExists = await page.$(tableSelector);
            if (tableExists) {
                const rawData = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    if (!table) return null;
                    const rows = Array.from(table.querySelectorAll('tr'));
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('th, td'));
                        return cells.map(cell => {
                            const links = cell.querySelectorAll('a');
                            links.forEach(a => { a.setAttribute('href', a.href); });
                            return cell.innerHTML.trim();
                        });
                    });
                }, tableSelector);

                if (rawData) {
                    content = cleanData(CleanEmptyArrayValue(rawData));
                }
            }
        } catch (e) {
            console.error(`Error scraping ${pageUrl}: ${e.message}`);
        }

        if (content.length > 0) {
            sitemapData.push({ name: pageUrl, title: pageTitle, content: content });

            // Generate individual HTML file
            const pageFileName = pageUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            const htmlPath = path.join(sessionDir, pageFileName);
            const htmlContent = generatePageHtml(pageUrl, pageTitle, content);
            fs.writeFileSync(htmlPath, htmlContent);
            console.log(`HTML saved: ${htmlPath}`);

            // Optional Google Doc conversion
            if (isGoogleDocEnabled) {
                const docName = `Scraped - ${pageTitle || siteName} (${pageUrl})`;
                await uploadToDrive(htmlPath, docName);
            }
        }
    }

    // Optional JSON output
    if (isJsonEnabled) {
        const jsonPath = path.join(sessionDir, 'full-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify({ sitemap: sitemapData, assets }, null, 2));
        console.log(`JSON data saved to ${jsonPath}`);
    }

    console.log(`\nScrape complete. All files saved to: ${sessionDir}`);
    await browser.close();
})();