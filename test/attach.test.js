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
        excellent.attach(f.node, 'missingCtrl');
        expect(f.node.innerHTML).toBe('missing content');
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
        expect(e.getAttribute('data-e-bind')).toBe('attrTest1,attrTest2');
        excellent.attach(e, ['attrTest3', 'attrTest3']);
        expect(e.getAttribute('data-e-bind')).toBe('attrTest1,attrTest2');
    });

    it('must globally register the element when not registered', () => {

    });

    it('must skip element registration, if it was registered', () => {

    });

    it('must skip setting controllers when already present', () => {

    });

});

describe('negative', () => {

    it('must throw on invalid element', () => {
        const err = 'Invalid DOM Element specified.';
        expect(() => {
            excellent.attach();
        }).toThrow(err);
        expect(() => {
            excellent.attach(123);
        }).toThrow(err);
        expect(() => {
            excellent.attach({});
        }).toThrow(err);
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
