'use strict';

const gulp = require('gulp');
const uglify = require('gulp-uglify');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const insert = require('gulp-insert');

const SOURCE = './src/excellent.js';
const SOURCE_LINT = ['./src/excellent.js', './test/*.test.js'];
const DEST = 'excellent.min.js';

const version = require('./package.json').version;

const copyright = `/**
 * Excellent.js v${version}
 * Copyright 2018 Vitaly Tomilov
 * Released under the MIT License
 * https://github.com/vitaly-t/excellent
 */
`;

gulp.task('lint', () => {
    return gulp.src(SOURCE_LINT)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', ['lint'], () => {
});

function patch(content) {
    return copyright + content.replace(/<version>/, version);
}

gulp.task('build', () => {
    return gulp.src(SOURCE)
        .pipe(uglify())
        .pipe(rename(DEST))
        .pipe(insert.transform(patch))
        .pipe(gulp.dest('./src'));
});

gulp.task('default', ['lint', 'test', 'build']);
