var gulp = require('gulp'),
    del = require('del'),
    fs = require('fs'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    gulpSass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    minifycss = require('gulp-minify-css'),
    replace = require('gulp-replace'),
    tinypng = require('gulp-tinypng'),
    rev = require('gulp-rev'),
    revCollector = require('gulp-rev-collector'), 
    vinylPaths = require('vinyl-paths'),
    gulpSequence = require('gulp-sequence'),
    fileinclude = require('gulp-file-include'),
    argv = require('minimist')(process.argv.slice(2)),
    browserSync = require('browser-sync').create(),
    reload = browserSync.reload,
    spritesmith = require('gulp.spritesmith'),
    merge = require('merge-stream');


var pathName= 'localhost/gulp-4/activity/',
    dist    = 'dist/' + argv.p + '/',
    source  = 'src/' + argv.p + '/',
    css     = 'css/',
    sass    = 'sass/',
    js      = 'js/',
    img     = 'img/',
    html    = '',
    imgBak  = source + 'img_bak/',
    dCSS    = dist + css,
    dJS     = dist + js,
    dIMG    = dist + img,
    dHTML   = dist,
    sCSS    = source + css,
    sSASS   = source + sass,
    sJS     = source + js,
    sIMG    = source + img,
    sHTML   = source + html,
    sView   = source + '__view/',
    sSprite = source + 'sprite/',
    revPath = './rev/';


var exclude = {
    js : [],
    css : [source + 'css/**/sprite.css']
}




gulp.task('jsUglify', function(){
    var target = [sJS + '*.js'];

    return gulp.src(target)
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest(dJS))
        .pipe(rev.manifest('rev-js.json'))
        .pipe(gulp.dest(revPath));
})


gulp.task('cssSass', function() {
    return new Promise(function(resolve, reject) {
        return setTimeout(function() {
            return gulp.src(sSASS + '**/*.scss')
            .pipe(sourcemaps.init())
            .pipe(gulpSass())
            .on('error', function(e) {
                return reject(e) && this.end();
            })
            .pipe(sourcemaps.write())
            .pipe(gulp.dest(sCSS))
            .on('end', resolve)
            .pipe(reload({stream: true}));
        }, 500);
    }).catch(function(e) {
        return console.warn(e.messageFormatted);
    });
});


gulp.task('cssMinify', function(){
    var target = [sCSS + '*.css'];

    return gulp.src(target)
        .pipe(minifycss())
        .pipe(rev())
        .pipe(gulp.dest(dCSS))
        .pipe(rev.manifest('rev-css.json'))
        .pipe(gulp.dest(revPath));
})

gulp.task('imgCopy', function(){
    return gulp.src([sIMG + '**/*.*'])
        .pipe(rev())
        .pipe(gulp.dest(dIMG))
        .pipe(rev.manifest('rev-img.json'))
        .pipe(gulp.dest(revPath));
})


gulp.task('tinypng', function () {
    return gulp.src(sIMG + '**/*.png')
        .pipe(gulp.dest(imgBak))
        .pipe(tinypng('===Key==='))
        .pipe(gulp.dest(sIMG));
});


gulp.task('jsRev', function(){
    return gulp.src([revPath + '*.json', dJS + '**/*.js'])
        .pipe(revCollector())
        .pipe(gulp.dest(dJS));
})

gulp.task('cssRev', function(){
    return gulp.src([revPath + '*.json', dCSS + '**/*.css'])
        .pipe(revCollector())
        .pipe(gulp.dest(dCSS));
})


gulp.task('htmlRev', function(){
    return gulp.src([revPath + '*.json', sView + '*.html'])
        .pipe(replace('../../js', '../../../js'))
        .pipe(replace('../../css', '../../../css'))
        .pipe(revCollector())
        .pipe(gulp.dest(dHTML));
})



gulp.task('htmlInclude', function() {
    return gulp.src(sHTML + '*.html')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: 'frame/public/',
            context: {
                aCss: [],
                aScript: [],
                responsiveUrl: '',
                auth: true,
                booking: true,
                description: ''
            }
        }))
        .pipe(gulp.dest(sView));
});



gulp.task('htmlUrlReplace', function() {
    return gulp.src(sView + '*.html')
        .pipe(replace(/(src|href)=\"(?!http|javascript|#)/g, '$1="../'))
        .pipe(gulp.dest(sView))
})



gulp.task('allClean', function(){
    return del([dist + '**/*.*', revPath + '**/**']);
})



gulp.task('sprite', function() {
    var spriteData = gulp.src([sSprite + 'i-*.png'])
        .pipe(spritesmith({
        imgName: 'sprite.png',
        cssName: 'sprite.css',
        cssTemplate: 'css.template'
    }));
    var imgStream = spriteData.img
        .pipe(gulp.dest(sIMG));

    var cssStream = spriteData.css
        .pipe(gulp.dest(sCSS));

    return merge(imgStream, cssStream);
});



gulp.task('browserSync', function(){
    browserSync.init({
        open: "external",
        proxy: pathName + sView + "index.html"
        //server: "./",
        //startPath: sView + "index.html"
    });

    gulp.watch(sJS + '**/*.js').on('change', reload);
    gulp.watch(sCSS + '**/*.css').on('change', reload);
    gulp.watch(sIMG + '**/*.*', reload);
    gulp.watch(sSprite + '**/*.png', gulp.series('sprite'));
    gulp.watch(sSASS + '**/*.scss').on('change', gulp.series('cssSass', reload));
    gulp.watch(sHTML + '*.html').on('change', gulp.series('htmlUrlReplace', reload));
})



gulp.task('frameCopy', function() {
    if (!argv.t) {
        console.log('缺少类型参数：-t')
        return false;
    }
    return new Promise(function(resolve, reject) {
        fs.stat(source, function(err, stat) {
            if(err == null) {
                console.log('目录已存在,开始监听...');
                return resolve();
            } else if(err.code == 'ENOENT') {
                gulp.src('frame/' + argv.t + '/**/**')
                    .pipe(gulp.dest(source))
                    .on('end', resolve)
            }
        });
    });
})


gulp.task('pathCheck', function() {
    if (!argv.p) {
        console.log('缺少路径参数：-p')
        return false;
    }
    return new Promise(function(resolve, reject) {
        fs.stat(source, function(err, stat) {
            if(err == null) {
                return resolve();
            } else if(err.code == 'ENOENT') {
                console.log('路径错误');
                return false;
            }
        });
    });
})




gulp.task('dev', gulp.series('pathCheck', 'htmlInclude', 'htmlUrlReplace', 'browserSync'));

gulp.task('build', gulp.series('pathCheck', 'allClean', 'jsUglify', 'cssMinify', 'imgCopy', 'cssRev', 'jsRev', 'htmlInclude', 'htmlRev'));

gulp.task('init', gulp.series('frameCopy', 'dev'));