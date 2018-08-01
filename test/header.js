const puppeteer = require('puppeteer');
const path = require('path');

const puppeteerOptions = {
    args: ['--no-sandbox'], // this is to make puppeteer work on Travis CI
    headless: true
};

async function createTest(file) {
    const browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    await page.goto(`file://${path.join(__dirname, file)}`);
    await page.addScriptTag({path: 'src/excellent.js'});
    return {page, browser};
}

module.exports = {createTest};
