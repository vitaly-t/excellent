describe('positive', () => {

    beforeEach(() => {
        require('../src/excellent');
        document.body.innerHTML = `
            <div e-bind="mod.first"></div>
            <div e-bind="mod.space.second"></div>
        `;

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
        excellent.bind();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetModules();
    });

    test('simple names', () => {
        expect(document.querySelector('[e-bind*="first"]').innerHTML).toBe('first value');
    });

    test('nested namespaces', () => {
        expect(document.querySelector('[e-bind*="second"]').innerHTML).toBe('second value');
    });

    test('must throw on invalid module name', () => {

    });

});

describe('negative', () => {

    beforeAll(() => {
        require('../src/excellent');
    });

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