beforeEach(() => {
    require('../src/excellent');
    document.body.innerHTML = `
            <div e-bind="first"></div>
            <div e-bind="second"></div>
            <div id="last"></div>`;

    excellent.addController('first', () => {

    });
    excellent.addController('second', () => {
    });

    excellent.bind(true);
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
});

describe('positive', () => {

    it('must create missing controllers', () => {
        excellent.addController('missingCtrl', ctrl => {
            ctrl.node.innerHTML = 'missing content';
        });
        const f = excellent.findOne('first');
        const c = excellent.attach(f.node, 'missingCtrl');
        expect(f.node.innerHTML).toBe('missing content');
        expect(c && typeof c).toBe('object');
        expect(Array.isArray(c)).toBe(false);
    });

    it('must skip existing controllers', () => {
        excellent.addController('one', ctrl => {
            ctrl.node.innerHTML += 'one content';
        });
        const e = document.getElementById('last');
        const c = excellent.attach(e, ['one', 'one', 'one']);
        expect(c.length).toBe(3);
        expect(c[0] === c[1] && c[0] === c[2]).toBe(true);
        expect(e.innerHTML).toBe('one content');
    });

    it('must add binding attribute for unique controllers when missing', () => {
        excellent.addController('attrTest1', () => {
        });
        excellent.addController('attrTest2', () => {
        });
        excellent.addController('attrTest3', () => {
        });
        const e = document.getElementById('last');
        excellent.attach(e, ['attrTest1', 'attrTest2', 'attrTest1', 'attrTest2']);
        expect(e.getAttribute('data-e-bind')).toBe('attrTest1, attrTest2');
        excellent.attach(e, ['attrTest3', 'attrTest3']);
        expect(e.getAttribute('data-e-bind')).toBe('attrTest1, attrTest2');
    });

    it('must trigger onDestroy event for attached elements', () => {
        const destroyed = [];
        excellent.addController('nt1', ctrl => {
            ctrl.onDestroy = function () {
                destroyed.push(ctrl.name);
            };
        });
        excellent.addController('nt2', ctrl => {
            ctrl.onDestroy = function () {
                destroyed.push(ctrl.name);
            };
        });
        const root = document.getElementById('last');
        const f = document.createDocumentFragment();
        const e1 = document.createElement('div');
        f.appendChild(e1);
        const e2 = document.createElement('div');
        f.appendChild(e2);
        root.appendChild(f);
        excellent.attach(e1, 'nt1');
        excellent.attach(e2, ['nt1', 'nt2']);
        root.innerHTML = '';
        const p = new Promise(resolve => setTimeout(() => resolve(destroyed), 2000));
        return expect(p).resolves.toEqual(['nt1', 'nt2', 'nt1']);
    });

});

describe('negative', () => {

    it('must throw on invalid element', () => {
        expect(() => {
            excellent.attach();
        }).toThrow('Parameter <undefined> does not represent a valid DOM element.');
        expect(() => {
            excellent.attach('');
        }).toThrow('Parameter "" does not represent a valid DOM element.');
        expect(() => {
            excellent.attach(123);
        }).toThrow('Parameter <123> does not represent a valid DOM element.');
        expect(() => {
            excellent.attach({});
        }).toThrow('Parameter {} does not represent a valid DOM element.');
    });

    it('must throw when called during a controller construction', () => {
        excellent.addController('badController', () => {
            excellent.attach({innerHTML: ''});
        });
        const f = excellent.findOne('first');
        f.node.innerHTML = '<div e-bind="badController"></div>';
        expect(() => {
            f.bind(true);
        }).toThrow('Cannot invoke ERoot.attach from a controller constructor.');
    });

    it('must throw on invalid controller names', () => {
        expect(() => {
            excellent.attach({innerHTML: ''});
        }).toThrow('Invalid controller name <undefined> specified.');
        expect(() => {
            excellent.attach({innerHTML: ''}, 123);
        }).toThrow('Invalid controller name <123> specified.');
        expect(() => {
            excellent.attach({innerHTML: ''}, 'a b');
        }).toThrow('Invalid controller name "a b" specified.');
        expect(() => {
            excellent.attach({innerHTML: ''}, ['a b']);
        }).toThrow('Invalid controller name "a b" specified.');

    });
});
