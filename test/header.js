const puppeteer = require('puppeteer');
const path = require('path');

async function createTest(file) {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(`file://${path.join(__dirname, file)}`);
    await page.addScriptTag({path: 'src/excellent.js'});
    return {page, browser};
}

module.exports = {createTest};
