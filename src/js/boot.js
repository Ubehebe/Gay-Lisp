/* Copyright 2011, 2012 Brendan Linn

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */


goog.provide('r5js.boot');


goog.require('r5js.Environment');
goog.require('r5js.ffi');
goog.require('r5js.ffiutil');
goog.require('r5js.JsObjOrMethod');
goog.require('r5js.Parser');
goog.require('r5js.Reader');
goog.require('r5js.RootEnvironment');
goog.require('r5js.Scanner');
goog.require('r5js.trampoline');


/**
 * @param {?} syntaxLib The R5RS syntax library.
 * @param {?} procLib The R5RS procedure library.
 * @suppress {undefinedVars} for console.log
 */
r5js.boot = function(syntaxLib, procLib) {
    nullEnv = new r5js.Environment('null-environment-5', null);
    install(syntaxLib, nullEnv);
    nullEnv.seal();
    // Node and IE<9 compat
    var consoleAvail = Function('return "console" in this;')();

    consoleAvail && console.log('installed syntax lib ok');

    /* r5RSEnv is the normal "root" environment. But we also have to
     support the "null environment", which is just the R5RS required syntax
     (no procedures). Example:

     (eval + (null-environment 5)) => +
     (eval '+ (null-environment 5)) => error (+ not defined)

     The easiest way to do this would be to put all the syntax definitions
     in nullEnv, all the procedure definitions in r5RSEnv, and
     set r5RSEnv.enclosingEnv = nullEnv. Unfortunately, macros
     require backlinks to their enclosing environments to resolve free
     identifiers correctly. If the macros are defined in the procedures'
     parent environment, things like

     (let ((x 1)) (+ x x))

     will fail, since + is defined in r5RSEnv, which is unreachable
     from nullEnv. So we make the null environment completely
     separate, and manually copy the bindings into r5RSEnv
     (remembering to clone the macros and set their backlinks correctly).
     Ugh. */

    r5RSEnv = new r5js.RootEnvironment(nullEnv.clone('scheme-report-environment-5'));
    installBuiltins(r5RSEnv);
    consoleAvail && console.log('installed primitive procedures ok');
    install(procLib, r5RSEnv);
    consoleAvail && console.log('installed library procedures ok');
    r5RSEnv.seal();
    consoleAvail && console.log('interpreter is ready');
    consoleAvail && console.log('----------------------------------------------------------------------');
};


/**
 * @param {?} lib
 * @param {!r5js.IEnvironment} env
 * @return {?}
 */
function install(lib, env) {
    return r5js.trampoline(
        new r5js.Parser(
            new r5js.Reader(
                new r5js.Scanner(lib)
            ).read()
        ).parse(null)
            .desugar(env).setStartingEnv(env),
        null,
        null,
        false
    );
}


/**
 * @param {!r5js.IEnvironment} env Environment to install the builtins into.
 */
function installBuiltins(env) {
    for (var category in R5JS_builtins) {
        var procs = R5JS_builtins[category];
        for (var name in procs)
            registerBuiltin(name, procs[name], env);
    }

    /* Experimental Scheme->JS FFI is browser-only for now.
     I used to have if (this.window === this), which is cleverer but
     doesn't work for strict mode. (Thanks, Stack Overflow!) */
    if (Function('return this;')().window) {
        env.addBinding(
            'window',
            r5js.ffiutil.newFFIDatum(new r5js.JsObjOrMethod(window)));
        for (var name in r5js.ffi) {
            registerBuiltin(name, r5js.ffi[name], env);
        }
    }
}