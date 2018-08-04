require('../src/excellent');
const { createTest } = require('./header');

describe('positive', () => {

    let t;
    beforeEach(async () => {
        t = await createTest('./html/modules.html');
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

    test('simple names', async () => {
        const selectors = '[e-bind*="first"]';
        await t.page.waitForSelector(selectors);
        const html = await t.page.$eval(selectors, e => e.innerHTML);
        expect(html).toBe('first value');
    });

    test('nested namespaces', async () => {
        const selectors = '[e-bind*="second"]';
        await t.page.waitForSelector(selectors);
        const html = await t.page.$eval(selectors, e => e.innerHTML);
        expect(html).toBe('second value');
    });

    test('must throw on invalid module name', () => {

    });

    afterEach(() => {
        t.browser.close();
    });

});

describe('negative', () => {
    it('must throw on invalid module names', () => {
        expect(() => {
            excellent.addModule();
        }).toThrow('Invalid module name "" specified.');
        expect(() => {
            excellent.addModule('t e s t');
        }).toThrow('Invalid module name "t e s t" specified.');
        expect(() => {
            excellent.addModule('\t o p s\r\n');
        }).toThrow('Invalid module name "\\t o p s\\r\\n" specified.');
    });
    it('must throw on invalid functions', () => {
        const err = 'Initialization function for module "a" is missing';
        expect(() => {
            excellent.addModule('a');
        }).toThrow(err);
        expect(() => {
            excellent.addModule('a', 123);
        }).toThrow(err);
    });
});