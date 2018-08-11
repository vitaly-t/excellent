'use strict';

const gulp = require('gulp');

const npm = {
    uglify: require('gulp-uglify'),
    sourcemaps: require('gulp-sourcemaps'),
    eslint: require('gulp-eslint'),
    rename: require('gulp-rename'),
    header: require('gulp-header'),
    replace: require('gulp-replace')
};

const SOURCE = './src/excellent.js';
const SOURCE_LINT = ['./src/excellent.js', './test/*.test.js', './gulpfile.js'];
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
        .pipe(npm.eslint())
        .pipe(npm.eslint.format())
        .pipe(npm.eslint.failAfterError());
});

gulp.task('build', () => {
    return gulp.src(SOURCE)
        .pipe(npm.sourcemaps.init())
        .pipe(npm.replace(/<version>/, version))
        .pipe(npm.uglify())
        .pipe(npm.header(copyright))
        .pipe(npm.rename(DEST))
        .pipe(npm.sourcemaps.write('.'))
        .pipe(gulp.dest('./src'));
});

gulp.task('default', gulp.series(['lint', 'build']));
