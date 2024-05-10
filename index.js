import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function getDOM() {
    const baseUrl = 'https://deno.com/blog/build-cloud-ide-subhosting';
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set a timeout of 30 seconds
    const timeout = 30000;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout'));
        }, timeout);
    });
    
    try {
        await Promise.race([
            page.goto(baseUrl),
            timeoutPromise
        ]);
        
        const links = await getLinks(page, baseUrl);
        console.log(links);

        const pdfContent = await convertPdf(browser, links);

        // Write all PDFs to a single file
        fs.writeFileSync('output.pdf', Buffer.concat(pdfContent));
        browser.close();
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

async function getLinks(page, baseUrl) {
    return await page.evaluate((baseUrl) => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.startsWith(baseUrl))
            .slice(0, 10);
    }, baseUrl);
}

async function convertPdf(browser, links) {
    const pdfContent = [];
    for (const link of links) {
        const linkPage = await browser.newPage();
        await linkPage.goto(link);
        const content = await linkPage.content();
        console.log(content);
        const pdf = await linkPage.pdf({ format: 'A4' });
        pdfContent.push(pdf);
        await linkPage.close();
    }
    return pdfContent;
}

getDOM();