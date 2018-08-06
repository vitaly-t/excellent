function dummy() {

}

beforeEach(() => {
    require('../src/excellent');
    document.body.innerHTML = `
                <div e-bind="main">
                    <div e-bind="first">
                        <div e-bind="nested"></div>
                        <div e-bind="nested"></div>
                        <div e-bind="nested"></div>
                    </div>
                    <div e-bind="second">
                        <div e-bind="nested"></div>
                        <div e-bind="nested"></div>
                    </div>
                    <div e-bind="third">
                        <div e-bind="nested"></div>
                    </div>                    
                </div>
                <div e-bind="last">Empty</div>`;

    excellent.addController('main', () => {
    });
    excellent.addController('first', () => {
    });
    excellent.addController('second', () => {
    });
    excellent.addController('third', () => {
    });
    excellent.addController('nested', ctrl => {
        ctrl.node.innerHTML = 'nested';
    });
    excellent.addController('last', () => {
    });

    excellent.bind();
});

afterEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
});

describe('positive', () => {

    describe('globally', () => {
        it('must find all controllers by name', () => {
            expect(excellent.find('nested').length).toBe(6);
            expect(excellent.find('invalid').length).toBe(0);
        });
        it('must find individual controllers by name', () => {
            expect(excellent.findOne('main')).toBeTruthy();
            expect(excellent.findOne('first')).toBeTruthy();
            expect(excellent.findOne('second')).toBeTruthy();
        });
    });

    describe('locally', () => {
        it('must find all children by name', () => {
            const e1 = excellent.findOne('first').find('nested');
            const e2 = excellent.findOne('second').find('nested');
            expect(e1.length).toBe(3);
            expect(e2.length).toBe(2);
            e1.forEach(a => {
                expect(a.node.innerHTML).toBe('nested');
            });
            e2.forEach(a => {
                expect(a.node.innerHTML).toBe('nested');
            });
            const thirdNested = excellent.findOne('third').findOne('nested');
            expect(thirdNested && thirdNested.name === 'nested').toBe(true);
        });
    });
});

describe('negative', () => {

    beforeAll(() => {
        require('../src/excellent');
    });

    it('must throw on invalid controller names', () => {
        expect(() => {
            excellent.find();
        }).toThrow('Invalid controller name <undefined> specified.');
        expect(() => {
            excellent.find(123);
        }).toThrow('Invalid controller name <123> specified.');
        expect(() => {
            excellent.find(true);
        }).toThrow('Invalid controller name <true> specified.');
        expect(() => {
            excellent.find(dummy);
        }).toThrow('Invalid controller name <function dummy() {}> specified.');
        expect(() => {
            excellent.find('one two');
        }).toThrow('Invalid controller name "one two" specified.');
        expect(() => {
            excellent.findOne();
        }).toThrow('Invalid controller name <undefined> specified.');
        expect(() => {
            excellent.findOne(123);
        }).toThrow('Invalid controller name <123> specified.');
        expect(() => {
            excellent.findOne(false);
        }).toThrow('Invalid controller name <false> specified.');
        expect(() => {
            excellent.findOne(dummy);
        }).toThrow('Invalid controller name <function dummy() {}> specified.');
        expect(() => {
            excellent.findOne('one two');
        }).toThrow('Invalid controller name "one two" specified.');
    });

    it('must throw when unexpected number of controllers found', () => {
        expect(() => {
            excellent.findOne('nested');
        }).toThrow('Expected a single controller from findOne("nested"), but found 6.');
        expect(() => {
            excellent.findOne('first').findOne('nested');
        }).toThrow('Expected a single controller from "first".findOne("nested"), but found 3.');
    });

});
