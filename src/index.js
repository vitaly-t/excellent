var excellent = {};
if (typeof module === 'object' && module && typeof module.exports === 'object') {
    module.exports = excellent; // Inside Node.js
}
else {
    window.excellent = excellent; // Inside a browser
}
