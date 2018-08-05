describe('positive', () => {

    beforeEach(() => {
        require('../src/excellent');
        document.body.innerHTML = `
            <div e-bind="mod.first"></div>
            <div e-bind="mod.deep.second"></div>
            <div e-bind="mod.deep.space.third"></div>
        `;

        excellent.addModule('mod', function () {
            this.first = function () {
                this.node.innerHTML = 'first';
            };
            this.deep = {
                second: function () {
                    this.node.innerHTML = 'second';
                },
                space: {
                    third: function () {
                        this.node.innerHTML = 'third';
                    }
                }
            };
        });
        excellent.bind();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetModules();
    });

    test('should resolve top-level controller', () => {
        expect(document.querySelector('[e-bind*="first"]').innerHTML).toBe('first');
    });

    test('should resolve nested controllers', () => {
        expect(document.querySelector('[e-bind*="mod.deep.second"]').innerHTML).toBe('second');
        expect(document.querySelector('[e-bind*="mod.deep.space.third"]').innerHTML).toBe('third');
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