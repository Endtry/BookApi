const gulp = require('gulp');
const ts = require('gulp-typescript');
const JSON_FILES = ['src/*.json', 'src/**/*.json'];
const exec = require('child_process').exec;

// pull in the project TypeScript config
const tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', () => {
  const tsResult = tsProject.src()
  .pipe(tsProject());
  return tsResult.js.pipe(gulp.dest('dist'));
});

gulp.task('watch', ['scripts'], () => {
  gulp.watch('src/**/*.ts', ['scripts']);
});

gulp.task('assets', function() {
  return gulp.src(JSON_FILES)
  .pipe(gulp.dest('dist'));
});

gulp.task('deleteDist', (cb)=>{
  exec('npm run clear-dist', (err, stdout, stderr)=> {
  cb(err);
  })
});

gulp.task("runBuild", (cb) => {
  exec('npm start', (err, stdout, stderr)=> {
    cb(err);
  })
});


gulp.task('default', ['watch', 'assets']);
gulp.task('start', ['deleteDist', 'scripts', 'assets']);
gulp.task('deploy', ['start']);
