const
  fs = require('fs'),
  path = require('path'),
  Module = require('module'),
  vm = require('vm'),
  moduleNotFoundError = require('module-not-found-error'),
  stripBom = require('strip-bom'),
  stripShebang = require('strip-shebang');

module.exports = (filename, stubs) => {
  filename = path.resolve(filename);
  var dirname = path.dirname(filename);
  var module = new Module(1, this.parent);
  module.filename = filename;

  return vm.
    runInThisContext(
      '(function (exports, require, module, __filename, __dirname, process) { ' +
      stripShebang(stripBom(fs.readFileSync(filename, 'utf8'))) +
      '\n});',
      {
        filename,
        lineOffset: 0,
        displayErrors: true
      }
    ).
    call(
      module.exports,
      module.exports,
      name => {
        if(!stubs.hasOwnProperty(name)) {
          throw moduleNotFoundError(name);          
        }
        return stubs[name];
      },
      module,
      filename,
      dirname,
      null
    );
}
