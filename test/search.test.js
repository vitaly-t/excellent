describe('positive', () => {
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
                </div>
                <div e-bind="last">
                    Empty
                </div>`;
        excellent.addController('main', () => {
        });
        excellent.addController('first', () => {
        });
        excellent.addController('second', () => {
        });
        excellent.addController('nested', ctrl => {
            ctrl.node.innerHTML = 'nested';
        });
        excellent.addController('last', ctrl => {
            ctrl.node.innerHTML = 'last';
        });
        excellent.bind();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.resetModules();
    });

    describe('globally', () => {
        it('must find all controllers by name', () => {
            expect(excellent.find('nested').length).toBe(5);
        });
        it('must find individual controllers by name', () => {
            expect(excellent.findOne('main')).toBeTruthy();
            expect(excellent.findOne('first')).toBeTruthy();
            expect(excellent.findOne('second')).toBeTruthy();
        });
    });

    describe('locally', () => {
        it('must find all children by name', () => {
            expect(excellent.findOne('first').find('nested').length).toBe(3);
            const e = excellent.findOne('second').find('nested');
            expect(e.length).toBe(2);
            e.forEach(a => {
                expect(a.node.innerHTML).toBe('nested');
            });
        });
    });

});
