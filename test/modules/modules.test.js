const {createTest} = require('../header');

test('first', async () => {
    const t = await createTest('./modules/main.html');
    await t.page.waitForSelector('body');
    const html = await t.page.$eval('body', e => e.innerHTML);
    expect(html).toBe('works');
    t.browser.close();
});
