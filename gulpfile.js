'use strict';

const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');

const source = [
    './src/wraps/header.txt',
    './src/index.js',
    './src/find.js',
    './src/wraps/footer.txt',
];

gulp.task('build', function () {
    return gulp.src(source)
        .pipe(concat('excellent.js'))
        .pipe(gulp.dest('./build/'))
});

gulp.task('compress', function () {
    return gulp.src('./build/excellent.js')
        uglify()
        gulp.dest('test.js')
});

gulp.task('default', gulp.series(['build', 'compress']));
