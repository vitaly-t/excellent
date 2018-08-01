const {createTest} = require('./header');

describe('positive', () => {

    let t;
    beforeEach(async () => {
        t = await createTest('./html/controllers.html');
        await t.page.evaluate(() => {
            excellent.addController('first', function () {
                this.node.innerHTML += 'first message.';
            });
            excellent.addController('second', ctrl => {
                ctrl.node.innerHTML += 'second message.';
            });
            excellent.addController('combined', ctrl => {
                ctrl.onInit = function () {
                    this.extend(['first', 'second']);
                };
            });
        });
        await t.bind();
    });

    test('controller must work via this', async () => {
        const selector = '[e-bind*="first"]';
        await t.page.waitForSelector(selector);
        const html = await t.page.$eval(selector, e => e.innerHTML);
        expect(html).toBe('first message.');
    });

    test('controller must work via parameter', async () => {
        const selector = '[e-bind*="second"]';
        await t.page.waitForSelector(selector);
        const html = await t.page.$eval(selector, e => e.innerHTML);
        expect(html).toBe('second message.');
    });

    test('inheritance', async () => {
        const selector = '[e-bind*="combined"]';
        await t.page.waitForSelector(selector);
        const html = await t.page.$eval(selector, e => e.innerHTML);
        expect(html).toBe('first message.second message.');
    });

    afterEach(() => {
        t.browser.close();
    });
});

describe('negative', () => {
    it('must throw on invalid controller names', () => {
        expect(() => {
            excellent.addController();
        }).toThrow('Invalid controller name "" specified.');
        expect(() => {
            excellent.addController('t e s t');
        }).toThrow('Invalid controller name "t e s t" specified.');
        expect(() => {
            excellent.addController('\t o p s\r\n');
        }).toThrow('Invalid controller name "\\t o p s\\r\\n" specified.');
    });
    it('must throw on invalid functions', () => {
        const err = 'Initialization function for controller "a" is missing';
        expect(() => {
            excellent.addController('a');
        }).toThrow(err);
        expect(() => {
            excellent.addController('a', 123);
        }).toThrow(err);
    });
});
