'use strict';

const
  fs = require('fs'),
  path = require('path'),
  walk = require('fs-walk'),
  Module = require('module'),
  vm = require('vm'),
  moduleNotFoundError = require('module-not-found-error'),
  stripBom = require('strip-bom'),
  stripShebang = require('strip-shebang'),
  multimatch = require('multimatch'),
  cwd = process.cwd();


let coverage = false, istanbul = null, coverageFiles = [], extraFiles = [], coverageMap = {};

if(istanbul === null && process.env.hasOwnProperty('UNIQUIRE_COVERAGE_FILE')) {
  coverage = true;

  istanbul = require('istanbul');

  /*add all matching files as empty */
  let match = ['lib/**/*.js'];

  if(process.env.hasOwnProperty('UNIQUIRE_COVERAGE_INCLUDE')) {
    match = JSON.parse(process.env.UNIQUIRE_COVERAGE_INCLUDE);
  }

  const walker = walk.walk(cwd, (root, filename, stat, next) => {
    filename = path.relative(cwd, path.join(root, filename));

    const xxx = multimatch([filename], match);

    if(xxx.length) {
       extraFiles.push(xxx[0]);
    }

    next();
  });

  process.on('exit', code => {
    const collector = new istanbul.Collector();

    const instrumenter = new istanbul.Instrumenter(),
      transformer = instrumenter.instrumentSync.bind(instrumenter);

    coverageFiles.forEach(curr => {
      collector.add(curr);
    });

    const arrayOfThings = collector.getFinalCoverage();

    for(let i = 0; i <extraFiles.length; i++) {

      if(!coverageMap.hasOwnProperty(extraFiles[i])) {
        transformer(
          stripShebang(stripBom(fs.readFileSync(extraFiles[i], 'utf8'))),
          path.relative(cwd, extraFiles[i])
        );

        Object.keys(instrumenter.coverState.s).forEach(function (key) {
          instrumenter.coverState.s[key] = 0;
        });

        arrayOfThings[extraFiles[i]] = instrumenter.coverState;
      }
    }

    fs.writeFileSync(
      process.env.UNIQUIRE_COVERAGE_FILE,
      JSON.stringify(arrayOfThings)
    );
  });
}

module.exports = (filename, stubs, stubGlobals) => {
  filename = path.resolve(path.dirname(module.parent.filename), filename);
  var dirname = path.dirname(filename);
  var subModule = new Module(1, this.parent);
  subModule.filename = filename;

  let content = stripShebang(stripBom(fs.readFileSync(filename, 'utf8')));

  if(coverage) {
    const name = path.relative(cwd, filename);
    coverageMap[name] = true;

    const instrumenter = new istanbul.Instrumenter();

    content = instrumenter.instrumentSync(content, name);
  }

  stubGlobals = stubGlobals ? stubGlobals : { process: { env: {} } };

  const retval = vm.
    runInThisContext(
      '(function (exports, require, module, __filename, __dirname, __uniquire__) { ' +
      'var {' + (Object.keys(stubGlobals).join(',')) + '} = __uniquire__;' +
      content +
      '\nreturn { exports: module.exports'+(coverage?',__coverage__':'')+' }});',
      {
        filename,
        lineOffset: 0,
        displayErrors: true
      }
    ).
    call(
      subModule.exports,
      subModule.exports,
      name => {
        if(!stubs.hasOwnProperty(name)) {
          throw moduleNotFoundError(name);
        }
        return stubs[name];
      },
      subModule,
      filename,
      dirname,
      stubGlobals
    );

  if(coverage) {
    coverageFiles.push(retval.__coverage__);
  }

  return retval.exports;
}
