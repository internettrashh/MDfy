import puppeteer from 'puppeteer';
import TurndownService from 'turndown';
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';

const app = express();

// Use cors middleware
app.use(cors());

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public', 'Docs.html'));
});
app.get('/convert', async (req, res) => {
    const { url, numPages } = req.query;
    if (!url || !numPages) {
        return res.status(400).send('Missing url or numPages query parameter');
    }
    try {
        const markdown = await getDOM(url, numPages);
        res.send(markdown);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('An error occurred: ' + error.message);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

async function getDOM(url, numPages) {
    const baseUrl = url;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const timeout = 30000;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Timeout'));
        }, timeout);
    });
    
    const turndownService = new TurndownService();
    let markdown = '';

    try {
        await Promise.race([
            page.goto(baseUrl),
            timeoutPromise
        ]);
        
        const links = await getLinks(page, baseUrl, numPages);

        for (const link of links) {
            await page.goto(link);
            const html = await page.content();
            markdown += turndownService.turndown(html);
        }

        fs.writeFileSync('output.md', markdown);
        const result = await getDeepInfraChatCompletion(`You are an AI assistant that converts webpage content to markdown while filtering out unnecessary information. Please follow these guidelines:
Remove any inappropriate content, ads, or irrelevant information
If unsure about including something, err on the side of keeping it
Answer in English. Include all points in markdown in sufficient detail to be useful.
Aim for clean, readable markdown.
Return the markdown and nothing.
Input: ${markdown}`);
        fs.unlinkSync('output.md');
        if (result.choices && result.choices.length > 0) {
            const finalMarkdown = result.choices[0]?.message?.content || "";
            fs.writeFileSync('final.md', finalMarkdown);
            return finalMarkdown;
        } else {
            console.error('No choices returned from the API');
            return '';
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

async function getLinks(page, baseUrl, numPages) {
    return await page.evaluate((baseUrl, numPages) => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.startsWith(baseUrl))
            .slice(0, numPages);
    }, baseUrl, numPages);
}

async function getDeepInfraChatCompletion(input) {
    console.log('process.env.DEEPINFRA_API_KEY', process.env.DEEPINFRA_API_KEY)
    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`
        },
        body: JSON.stringify({
            model: "mistralai/Mixtral-8x22B-Instruct-v0.1",
            messages: [
                {
                    role: "user",
                    content: input
                }
            ]
        })
    });

    const result = await response.json();
    console.log(result);
    return result;
}