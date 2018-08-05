describe('positive', () => {

    beforeEach(() => {
        require('../src/excellent');
        document.body.innerHTML = `
            <div e-bind="first"></div>
            <div e-bind="second"></div>
            <div e-bind="combined"></div>
        `;

        excellent.addController('first', function () {
            this.node.innerHTML += 'first.';
        });
        excellent.addController('second', ctrl => {
            ctrl.node.innerHTML += 'second.';
        });
        excellent.addController('combined', ctrl => {
            ctrl.onInit = function () {
                this.extend(['first', 'second']);
            };
        });
        excellent.bind();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetModules();
    });

    test('controller must work via this', () => {
        expect(document.querySelector('[e-bind*="first"]').innerHTML).toBe('first.');
    });

    test('controller must work via parameter', () => {
        expect(document.querySelector('[e-bind*="second"]').innerHTML).toBe('second.');
    });

    test('inheritance', () => {
        expect(document.querySelector('[e-bind*="combined"]').innerHTML).toBe('first.second.');
    });

});

describe('negative', () => {

    beforeAll(() => {
        require('../src/excellent');
    });

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
