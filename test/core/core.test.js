const {createTest} = require('../header');

describe('basic controller', () => {

    let t;
    beforeEach(async () => {
        t = await createTest('./core/index.html');
        await t.page.evaluate(() => {
            excellent.addController('first', function () {
                this.node.innerHTML = 'first message';
            });
            excellent.addController('second', ctrl => {
                ctrl.node.innerHTML = 'second message';
            });
        });
        await t.bind();
    });

    test('must work via this', async () => {
        const selector = '[e-bind*="first"]';
        await t.page.waitForSelector(selector);
        const html = await t.page.$eval(selector, e => e.innerHTML);
        expect(html).toBe('first message');
    });

    test('must work via parameter', async () => {
        const selector = '[e-bind*="second"]';
        await t.page.waitForSelector(selector);
        const html = await t.page.$eval(selector, e => e.innerHTML);
        expect(html).toBe('second message');
    });

    afterEach(() => {
        t.browser.close();
    });
});

