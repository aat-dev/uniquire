const
  fs = require('fs'),
  path = require('path'),
  Module = require('module'),
  vm = require('vm'),
  moduleNotFoundError = require('module-not-found-error'),
  stripBom = require('strip-bom'),
  stripShebang = require('strip-shebang');

module.exports = (filename, stubs) => {
  filename = path.resolve(path.dirname(module.parent.filename), filename);
  var dirname = path.dirname(filename);
  var subModule = new Module(1, this.parent);
  subModule.filename = filename;

  return vm.
    runInThisContext(
      '(function (exports, require, module, __filename, __dirname, process) { ' +
      stripShebang(stripBom(fs.readFileSync(filename, 'utf8'))) +
      '\nreturn module.exports});',
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
      null
    );
}
