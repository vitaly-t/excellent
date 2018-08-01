const {createTest} = require('./header');

describe('positive', () => {
    const e = excellent;
    it('must have all the right properties', () => {
        expect(e && typeof e === 'object').toBe(true);
        expect(e.services && typeof e.services === 'object').toBe(true);
        expect(e.version).toBe('<version>');
        expect(typeof e.addController).toBe('function');
        expect(typeof e.addModule).toBe('function');
        expect(typeof e.addService).toBe('function');
        expect(typeof e.bind).toBe('function');
        expect(typeof e.find).toBe('function');
        expect(typeof e.findControllers).toBe('function');
        expect(e.onInit).toBeUndefined();
    });
});

describe('negative', () => {
});
