import puppeteer from "puppeteer";
import TurndownService from 'turndown';
import fs from 'fs';
import fetch from 'node-fetch';

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
        const result = await getDeepInfraChatCompletion(`You are an AI assistant that converts webpage content to markdown while filtering out unnecessary information. Please follow these guidelines:
Remove any inappropriate content, ads, or irrelevant information
If unsure about including something, err on the side of keeping it
Answer in English. Include all points in markdown in sufficient detail to be useful.
Aim for clean, readable markdown.
Return the markdown and nothing.
Input: ${markdown}`);
        fs.unlinkSync('output.md');
        if (result.choices && result.choices.length > 0) {
            fs.writeFileSync('final.md', result.choices[0]?.message?.content || "");
        } else {
            console.error('No choices returned from the API');
        }
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
            .slice(0, 10); // Limit to 10 links , edit this based on your token limits
    }, baseUrl);
}
//replace the llm if you wish am still experimenting on this part of the code , just make sure you have access to about 6-7k tokens per request
async function getDeepInfraChatCompletion(input) {
    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`
        },
        body: JSON.stringify({
            model: "meta-llama/Meta-Llama-3-8B-Instruct",
            messages: [
                {
                    role: "user",
                    content: input
                }
            ]
        })
    });

    const result = await response.json();
    return result;
}

getDOM();