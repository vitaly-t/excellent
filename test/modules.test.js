beforeEach(() => {
    require('../src/excellent');
    document.body.innerHTML = `
            <div e-bind="mod.first"></div>
            <div e-bind="mod.deep.second"></div>
            <div e-bind="mod.deep.space.third"></div>
            <div id="last"></div>`;

    class ValidCtrl extends window.EController {
        constructor() {
            super(arguments);
            this.node.innerHTML = 'good works';
        }
    }

    class InvalidCtrl {
    }

    excellent.addModule(' mod\t', function () {
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
        this.good = ValidCtrl;
        this.bad = InvalidCtrl;
    });
    excellent.bind(true);
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
});

describe('positive', () => {

    it('should ignore re-registration attempts', () => {
        const res = excellent.addModule('mod', () => {
            // all the other tests will continue working, which in itself
            // is the extra proof that repeated registration was ignored.
        });
        expect(res).toBe(false);
    });

    it('should resolve top-level controller', () => {
        expect(document.querySelector('[e-bind*="first"]').innerHTML).toBe('first');
    });

    it('should resolve nested controllers', () => {
        expect(document.querySelector('[e-bind*="mod.deep.second"]').innerHTML).toBe('second');
        expect(document.querySelector('[e-bind*="mod.deep.space.third"]').innerHTML).toBe('third');
    });

    it('should allow valid ES6 classes', () => {
        const e = document.createElement('div');
        excellent.attach(e, 'mod.good');
        expect(e.innerHTML).toBe('good works');
    });

});

describe('negative', () => {

    it('must throw on invalid ES6 classes', () => {
        const e = document.createElement('div');
        expect(() => {
            excellent.attach(e, 'mod.bad');
        }).toThrow('Invalid controller class "InvalidCtrl", as it does not derive from "EController"');
    });

    it('must throw on invalid module names', () => {
        expect(() => {
            excellent.addModule();
        }).toThrow('Invalid module name <undefined> specified.');
        expect(() => {
            excellent.addModule(null);
        }).toThrow('Invalid module name <null> specified.');
        expect(() => {
            excellent.addModule('');
        }).toThrow('Invalid module name "" specified.');
        expect(() => {
            excellent.addModule('   ');
        }).toThrow('Invalid module name "   " specified.');
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