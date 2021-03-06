#!/usr/bin/env node
/**
 * super-react
 *
 * https://github.com/mtomcal/super-react
 *
 * Opinionated Command Line Tool for Scaffolding out Nested React Components Into Files
 *
 * Usage:
 *
 * super-react "[string]" [--file=<components scaffold>.json] [--output=<path | "./components">]
 */
var Bluebird = require('bluebird');

var fs = require('fs');
Bluebird.promisifyAll(fs);

var path = require('path');
var _ = require('lodash');

var raw_args = process.argv.slice(2);

var args = require('cli-args')(raw_args);

var output_folder = args.output || './components/';

var settings = {
  "template_type": "es5",
  "extension": "js"
};

/**
 * ErrorHandler For Promise Rejects
 */
function errorHandler(err) {
  console.log(err.stack);
}

/**
 * outputReactClass
 *
 * name: filename
 * children: array of children names
 */
function outputReactClass(name, children) {
  var rendered;

  //Don't need js extension in import or require statements in template
  function extHelper(ext) {
    if (ext === "js") {
      return "";
    } else {
      return ext;
    }
  }

  //Open template
  fs.readFileAsync(path.join(__dirname, 'templates/', 'ReactClass.' + settings["template_type"] + '.js'))
    .then(function (contents){
      var compiled = _.template(contents);

      //Compile lodash template for React class
      rendered = compiled({name: name, children: children, ext: extHelper(settings["extension"])});

      //Create the output folder and if exists silently catch error
      return fs.mkdirAsync(output_folder)
        .caught(function (err) {
          return err;
        });
    })
    .then(function () {
      //Write the component to file if it doesnt already exist
      return fs.writeFileAsync(path.join(output_folder, name + "." + settings["extension"]), rendered, {flag: 'wx'});
    })
    .caught(errorHandler);
}

/**
 * recurseCreate
 *
 * Recursively handle the traversal of
 * scaffold graph tree.
 *
 * scaffold: tree of component keys
 * key: current key to iterate on
 */
function recurseCreate(scaffold, key) {
  if (_.isObject(scaffold)) {
    var children = _.keys(scaffold[key]);
    outputReactClass(key, children);
    if (children.length > 0) {
      children.forEach(function (child) {
        recurseCreate(scaffold[key], child);
      });
    }
  }
}

/**
 * scaffoldByFile
 *
 * Runs recurseCreate using scaffold data pulled from a file
 *
 * file: filepath
 *
 */
function scaffoldByFile(file) {
  fs.readFileAsync(file)
    .then(function (contents) {
      var scaffold = JSON.parse(contents);
      var keys = _.keys(scaffold);
      keys.forEach(function (key) {
        recurseCreate(scaffold, key);
      });
    })
    .caught(errorHandler);
}

/**
 * scaffoldByArgs
 *
 * Runs recurseCreate using scaffold data parsed
 * from Emmet style syntax
 *
 * tree: Emmet style string
 *
 */

function scaffoldByArgs(tree) {
  var scaffold = {};
  var cursor = scaffold;
  var chunk = "";
  //Parse char in string from left to right
  tree.split('').forEach(function (ch) {
    //If I find a caret add a new level to graph tree
    if (ch === '>') {
      cursor[chunk] = {};
      cursor = cursor[chunk];
      chunk = "";
      return;
    }
    //If I find a plus add a sibling key to graph tree
    if (ch === '+') {
      cursor[chunk] = {};
      chunk = "";
      return;
    }
    //If not a special char add char to create a token chunk
    chunk = chunk + ch;
  });
  //Finish off the last chunk and place it on graph tree
  cursor[chunk] = {};
  var keys = _.keys(scaffold);
  //Run recurseCreate on scaffold graph tree
  keys.forEach(function (key) {
    recurseCreate(scaffold, key);
  });
}

function main(args) {
  //Check for args and kick off nescessary operations
  _.keys(args).forEach(function (key) {
    if (_.isEmpty(args[key])) {
      return;
    }
    if (key === '_') {
      var pos_args = args[key];

      if (_.contains(pos_args, "es6")) {
        /* Global Settings Object */
        settings['template_type'] = "es6";
      }

      pos_args.filter(function (item) {
        return item !== "es6"
      })
      .map(function (item) {
        scaffoldByArgs(item);
      });

    }
    if (key === 'ext') {
      /* Global Settings Object */
      settings['extension'] = args[key];
    }
    if (key === 'file') {
      var filename = args[key];
      if (!_.isEmpty(filename)) {
        scaffoldByFile(args[key]);
      }
    }
  });
}

module.exports = main(args);
