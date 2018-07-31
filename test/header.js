const puppeteer = require('puppeteer');
const path = require('path');

async function createTest(file) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${path.join(__dirname, file)}`);
    return {page, browser};
}

module.exports = {createTest};
