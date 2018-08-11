function firstController() {
    this.node.innerHTML += 'first.';
}

beforeEach(() => {
    require('../src/excellent');
    document.body.innerHTML = `
            <div e-bind=" , first"></div>
            <div e-bind="second,,,"></div>            
            <div e-bind="combined"></div>
            <div e-bind="base"></div>
            <div e-bind="last"></div>
            <div e-bind="bottom_1"></div>
            <div e-bind="bottom_2"></div>
            <div id="dynamic">dynamic</div>
            <div e-bind="removable">dynamic</div>
            <div e-bind=" , ,,,,,  , "></div>`;

    excellent.addController('first', firstController);
    excellent.addController('second', ctrl => {
        ctrl.node.innerHTML += 'second.';
        excellent.bind(); // triggering nested binding;
    });
    excellent.addController('combined', ctrl => {
        ctrl.onInit = function () {
            this.extend(['first', 'second']);
        };
    });
    excellent.addController('base', ctrl => {
        ctrl.node.innerHTML = 'base';
    });

    excellent.addController('last', ctrl => {
        ctrl.depends(['base']);
        ctrl.onInit = function () {
            ctrl.extend('base');
            ctrl.node.innerHTML += '-last';
        };
    });
    excellent.addController('bottom_1', ctrl => {
        ctrl.onInit = function () {
            ctrl.extend(['base', 'last']);
            ctrl.node.innerHTML += '-bottom1';
        };
    });
    excellent.addController('bottom_2', ctrl => {
        ctrl.onInit = function () {
            ctrl.extend(['base', 'last', 'base', 'bottom_2', 'last', 'bottom_2']);
            ctrl.node.innerHTML += '-bottom2';
        };
    });
    excellent.addController('removable', () => {
    });

    excellent.bind(true);
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
});

describe('positive', () => {

    test('must not throw on re-registration with the same function', () => {
        expect(excellent.addController('first', firstController)).toBeUndefined();
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

    describe('inheritance', () => {
        it('must allow single derivation', () => {
            const a = excellent.find('last');
            expect(a.length).toBe(3);
            expect(a[0].node.innerHTML).toBe('base-last');
            expect(a[1].node.innerHTML).toBe('base-last-bottom1');
            expect(a[2].node.innerHTML).toBe('base-last-bottom2');
            expect(excellent.findOne('bottom_1').node.innerHTML).toBe('base-last-bottom1');
        });
        it('must reuse types when not repeated', () => {
            const c = excellent.findOne('bottom_1').node.controllers;
            expect(Object.keys(c)).toEqual(['bottom_1', 'base', 'last']);
            expect(c.base === c.last.node.controllers.base).toBe(true);
        });
        it('must reuse the types when repeated', () => {
            const c = excellent.findOne('bottom_2').node.controllers;
            expect(Object.keys(c)).toEqual(['bottom_2', 'base', 'last']);
            expect(c.base === c.last.node.controllers.base).toBe(true);
            expect(c.last === c.base.node.controllers.last).toBe(true);
            expect(c.bottom_2 === c.base.node.controllers.bottom_2).toBe(true);
            expect(c.bottom_2 === c.last.node.controllers.bottom_2).toBe(true);
        });
        it('must find extended controllers only during onPostInit', () => {
            let ctrl1, ctrl2, ctrl3, ctrl4;
            excellent.addController('uniqueController', ctrl => {
                ctrl.onPostInit = function () {
                    ctrl3 = excellent.findOne('derivedController');
                };
            });
            excellent.addController('privateController', () => {
            });
            excellent.addController('derivedController', ctrl => {
                ctrl.onInit = function () {
                    const a = excellent.find('uniqueController');
                    if (a.length) {
                        ctrl1 = a[0];
                    }
                    ctrl.extend('uniqueController');
                    ctrl.extend('privateController', true);
                };
                ctrl.onPostInit = function () {
                    ctrl2 = excellent.findOne('uniqueController');
                    ctrl4 = excellent.find('privateController');
                };
            });
            excellent.findOne('removable').node.innerHTML = '<div e-bind="derivedController"></div>';
            excellent.bind(true);
            expect(ctrl1).toBeUndefined();
            expect(ctrl2).toBeTruthy();
            expect(ctrl3).toBeTruthy();
            expect(ctrl4).toEqual([]);
        });
    });

    it('should generate proper live statistics', () => {
        const stat = excellent.analyze();
        expect(stat && typeof stat).toBe('object');
        expect(Object.keys(stat.controllers.live).length).toBe(8);
        expect(stat.controllers.registered).toEqual(['first', 'second', 'combined', 'base', 'last', 'bottom_1', 'bottom_2', 'removable']);
        expect(stat.elements.length).toBe(8);
    });

    describe('lifespan', () => {
        it('must trigger onDestroy event for all elements', () => {
            const destroyed = [];
            excellent.addController('notify1', ctrl => {
                ctrl.onDestroy = function () {
                    destroyed.push(ctrl.name);
                };
            });
            excellent.addController('notify2', ctrl => {
                ctrl.onDestroy = function () {
                    destroyed.push(ctrl.name);
                };
            });
            const removable = excellent.findOne('removable');
            removable.node.innerHTML = '<div e-bind="notify1"></div><div e-bind="notify2"></div><div e-bind="notify2"></div>';
            removable.bind(true);
            removable.node.innerHTML = '';
            const p = new Promise(resolve => setTimeout(() => resolve(destroyed), 2000));
            return expect(p).resolves.toEqual(['notify2', 'notify2', 'notify1']);
        });
    });

    describe('asynchronous binding', () => {
        it('must find new elements when bound globally', () => {
            const content = 'some dynamic content - 1';
            excellent.addController('dynamicController_1', ctrl => {
                ctrl.node.innerHTML = content;
            });
            const removable = excellent.findOne('removable');
            removable.node.innerHTML = '<div e-bind="dynamicController_1"></div>';
            const p = new Promise(resolve => {
                excellent.bind(() => {
                    resolve(excellent.findOne('dynamicController_1').node.innerHTML);
                });
            });
            return expect(p).resolves.toBe(content);
        });
        it('must find new elements when bound locally', () => {
            const content = 'some dynamic content - 2';
            excellent.addController('dynamicController_2', ctrl => {
                ctrl.node.innerHTML = content;
            });
            const removable = excellent.findOne('removable');
            removable.node.innerHTML = '<div e-bind="dynamicController_2"></div>';
            const p = new Promise(resolve => {
                excellent.bind(true);
                const ctrl = excellent.findOne('dynamicController_2');
                ctrl.bind(); // just for coverage;
                ctrl.bind(() => {
                    resolve(ctrl.node.innerHTML);
                });
            });
            return expect(p).resolves.toBe(content);
        });
        it('synchronous global binding must cancel all other bindings', () => {
            const content = 'some dynamic content - 3';
            excellent.addController('dynamicController_3', ctrl => {
                ctrl.node.innerHTML = content;
            });
            const removable = excellent.findOne('removable');
            removable.node.innerHTML = '<div e-bind="dynamicController_3"></div>';
            const p = new Promise(resolve => {
                excellent.bind(true);
                const ctrl = excellent.findOne('dynamicController_3');
                ctrl.bind(); // to be cancelled
                excellent.bind(true); // cancels the previous binding
                ctrl.bind(() => {
                    resolve(ctrl.node.innerHTML);
                });
            });
            return expect(p).resolves.toBe(content);
        });
        it('synchronous local binding must cancel asynchronous requests on the same node', () => {
            const content = 'some dynamic content - 4';
            excellent.addController('dynamicController_4', ctrl => {
                ctrl.node.innerHTML = content;
            });
            const removable = excellent.findOne('removable');
            removable.node.innerHTML = '<div e-bind="dynamicController_4"></div>';
            const p = new Promise(resolve => {
                excellent.bind(true);
                const ctrl = excellent.findOne('dynamicController_4');
                ctrl.bind(); // to be cancelled
                ctrl.bind(true); // cancels the previous binding
                ctrl.bind(() => {
                    resolve(ctrl.node.innerHTML);
                });
            });
            return expect(p).resolves.toBe(content);
        });

    });
});

describe('negative', () => {

    test('must throw on re-registration with a different function', () => {
        expect(() => {
            excellent.addController('first', () => {
            });
        }).toThrow('Controller with name "first" already exists.');
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

    it('must throw when extending before init', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'bla1');
        excellent.addController('bla1', ctrl => {
            ctrl.extend(['ops']);
        });
        expect(() => {
            excellent.bind(true);
        }).toThrow('Method "extend" cannot be used before initialization.');
    });

    it('must throw on invalid "extend" parameters', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'bla2');
        excellent.addController('bla2', ctrl => {
            ctrl.onInit = function () {
                ctrl.extend();
            };
        });
        expect(() => {
            excellent.bind(true);
        }).toThrow('Invalid controller name <undefined> specified.');
    });

    it('must throw when extending with invalid extend controller names', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'bla3');
        excellent.addController('bla3', ctrl => {
            ctrl.onInit = function () {
                ctrl.extend(['one two']);
            };
        });
        expect(() => {
            excellent.bind(true);
        }).toThrow('Invalid controller name "one two" specified.');
    });

    it('must throw when controller does not exist', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'nonExisting');
        expect(() => {
            excellent.bind(true);
        }).toThrow('Controller "nonExisting" not found.');
    });

    it('must throw on invalid controller name in the bindings', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'one two');
        expect(() => {
            excellent.bind(true);
        }).toThrow('Invalid controller name "one two".');
    });

    it('must throw on duplicate bindings', () => {
        document.getElementById('dynamic').setAttribute('e-bind', 'first, first');
        expect(() => {
            excellent.bind(true);
        }).toThrow('Duplicate controller name "first" not allowed.');
    });

    describe('Method "depends"', () => {
        it('must throw on invalid inputs', () => {
            const e = document.getElementById('dynamic');
            e.innerHTML = '<div e-bind="depends1"></div>';
            excellent.addController('depends1', ctrl => {
                ctrl.depends();
            });
            expect(() => {
                excellent.bind(true);
            }).toThrow('Invalid list of controller names.');
        });
        it('must throw on invalid controller names', () => {
            const e = document.getElementById('dynamic');
            e.innerHTML = '<div e-bind="depends2"></div>';
            excellent.addController('depends2', ctrl => {
                ctrl.depends(['one two']);
            });
            expect(() => {
                excellent.bind(true);
            }).toThrow('Invalid controller name "one two" specified.');
        });
        it('must throw when controller not found', () => {
            const e = document.getElementById('dynamic');
            e.innerHTML = '<div e-bind="depends3"></div>';
            excellent.addController('depends3', ctrl => {
                ctrl.depends(['nonExisting']);
            });
            expect(() => {
                excellent.bind(true);
            }).toThrow('Controller "depends3" depends on "nonExisting", which was not found.');
        });
        it('must throw when module not found', () => {
            const e = document.getElementById('dynamic');
            e.innerHTML = '<div e-bind="depends4"></div>';
            excellent.addController('depends4', ctrl => {
                ctrl.depends(['nonExisting.bla']);
            });
            expect(() => {
                excellent.bind(true);
            }).toThrow('Controller "depends4" depends on "nonExisting.bla", which was not found.');
        });

    });

});
