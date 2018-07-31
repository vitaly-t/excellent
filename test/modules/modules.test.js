const {createTest} = require('../header');

test('first', async () => {

    const test = await createTest('./modules/main.html');

    await test.page.waitForSelector('title');

    const html = await test.page.$eval('title', e => e.innerHTML);

    //console.log(html);

    test.browser.close();
});
