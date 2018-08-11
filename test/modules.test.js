beforeEach(() => {
    require('../src/excellent');
    document.body.innerHTML = `
            <div e-bind="mod.first"></div>
            <div e-bind="mod.deep.second"></div>
            <div e-bind="mod.deep.space.third"></div>
            <div id="last"></div>`;

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
    excellent.bind(true);
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
});

describe('positive', () => {

    test('should ignore re-registration attempts', () => {
        excellent.addModule('mod', () => {
            // all the other tests will continue working,
            // which is in itself the indication that repeated
            // registration was ignored.
        });
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

    it('must throw when module does not exist', () => {
        document.getElementById('last').setAttribute('e-bind', 'ops.method');
        expect(() => {
            excellent.bind(true);
        }).toThrow('Module "ops" not found: <div id="last" e-bind="ops.method">');
    });

    it('must throw when module controller is missing', () => {
        document.getElementById('last').setAttribute('e-bind', 'mod.nonExisting');
        expect(() => {
            excellent.bind(true);
        }).toThrow('Controller "mod.nonExisting" not found: <div id="last" e-bind="mod.nonExisting">');
    });

});