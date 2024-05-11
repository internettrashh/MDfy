import puppeteer from "puppeteer";
import TurndownService from 'turndown';
import fs from 'fs';
import Groq from 'groq-sdk';
import 'dotenv/config'


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
    
    const turndownService = new TurndownService();
    let markdown = '';

    try {
        await Promise.race([
            page.goto(baseUrl),
            timeoutPromise
        ]);
        
        const links = await getLinks(page, baseUrl);
        
        for (const link of links) {
            await page.goto(link);
            const html = await page.content();
            markdown += turndownService.turndown(html);
        }

        fs.writeFileSync('output.md', markdown);
        const result = await getGroqChatCompletion(`You are an AI assistant that converts webpage content to markdown while filtering out unnecessary information. Please follow these guidelines:
Remove any inappropriate content, ads, or irrelevant information
If unsure about including something, err on the side of keeping it
Answer in English. Include all points in markdown in sufficient detail to be useful.
Aim for clean, readable markdown.
Return the markdown and nothing else.
Input: ${markdown}`);
        fs.unlinkSync('output.md');
        fs.writeFileSync('final.md', result.choices[0]?.message?.content || "");
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
            .slice(0, 1);
    }, baseUrl);
}

async function getGroqChatCompletion(input) {
    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    return groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: input
            }
        ],
        model: "llama3-8b-8192"
    });
}

getDOM();