const {createTest} = require('../header');

describe('modules', () => {

    let t;
    beforeEach(async () => {
        t = await createTest('./modules/index.html');
        await t.page.evaluate(() => {
            excellent.addModule('mod', function () {
                this.first = function () {
                    this.node.innerHTML = 'first value';
                };
                this.space = {
                    second: function () {
                        this.node.innerHTML = 'second value';
                    }
                };
            });
        });
        await t.bind();
    });

    test('must work directly', async () => {
        const selectors = '[e-bind*="first"]';
        await t.page.waitForSelector(selectors);
        const html = await t.page.$eval(selectors, e => e.innerHTML);
        expect(html).toBe('first value');
    });

    test('must work with nested namespaces', async () => {
        const selectors = '[e-bind*="second"]';
        await t.page.waitForSelector(selectors);
        const html = await t.page.$eval(selectors, e => e.innerHTML);
        expect(html).toBe('second value');
    });

    afterEach(() => {
        t.browser.close();
    });

});
