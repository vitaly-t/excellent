describe('positive', () => {

    it('must have all the right properties', () => {
        require('../src/excellent');
        const e = excellent;
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
        jest.resetModules();
    });

    it('should use an alternate name if specified', () => {
        const name = 'alternateName';
        expect(window[name]).toBeUndefined();
        document.body.innerHTML = `<div e-root="${name}"></div>`;
        require('../src/excellent');
        expect(window[name]).not.toBeUndefined();
        document.body.innerHTML = "";
        jest.resetModules();
    });

    it('should call onInit on DOMContentLoaded', () => {
        require('../src/excellent');
        excellent.onInit = jest.fn();
        window.document.dispatchEvent(new Event("DOMContentLoaded", {}));
        expect(excellent.onInit).toBeCalled();
        jest.resetModules();
    });

});


describe('negative', () => {

    afterEach(() => {
        document.body.innerHTML = "";
        jest.resetModules();
    });

    it('should fail with multiple root elements specified', () => {
        document.body.innerHTML = '<div e-root="alternateName"></div><div e-root="anotherAlternateName"></div>';
        expect(() => require('../src/excellent')).toThrow('Multiple e-root elements are not allowed.');
    });
    it('should fail on an invalid alternate name', () => {
        document.body.innerHTML = `<div e-root="123"></div>`;
        expect(() => require('../src/excellent')).toThrow(`Invalid "123" root name specified.`);
    });

});
