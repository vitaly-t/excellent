const {createTest} = require('./header');

describe('positive', () => {

});

describe('negative', () => {
    it('must throw on invalid service names', () => {
        expect(() => {
            excellent.addService();
        }).toThrow('Invalid service name "" specified.');
        expect(() => {
            excellent.addService('t e s t');
        }).toThrow('Invalid service name "t e s t" specified.');
        expect(() => {
            excellent.addService('\t o p s\r\n');
        }).toThrow('Invalid service name "\\t o p s\\r\\n" specified.');
    });
    it('must throw on invalid functions', () => {
        const err = 'Initialization function for service "a" is missing';
        expect(() => {
            excellent.addService('a');
        }).toThrow(err);
        expect(() => {
            excellent.addService('a', 123);
        }).toThrow(err);
    });
});
