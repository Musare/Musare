'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const nodemon = require('gulp-nodemon');

gulp.task('sass', () => {
  return gulp.src('./src/sass/**/*.scss')
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(gulp.dest('./public/css'));
});

gulp.task('start', () => {
  nodemon({
    script: 'src/app.js',
		ext: 'js'
  });
});

gulp.task('default', ['start'], () => {
  gulp.watch('./src/sass/**/*.scss', ['sass']);
});
