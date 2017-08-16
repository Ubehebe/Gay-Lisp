# r5js
r5js is an interpreter for the [Scheme](http://en.wikipedia.org/wiki/Scheme_(programming_language))
programming language. It is written in JavaScript.

r5js aims for full compliance with [R5RS](http://www.schemers.org/Documents/Standards/R5RS/HTML/),
the fifth edition of the Scheme specification. It supports hygienic macros,
first-class continuations, and proper tail recursion. It includes over 700 tests exercising most of
the language's facilities.

r5js is free software, licensed under [GPLv3](http://www.gnu.org/copyleft/gpl.html).

## Building
r5js uses [Bazel](https://bazel.build) as its build system.

1. `git clone https://github.com/Ubehebe/r5js`
2. `bazel build //...`

## Running
TODO expose bazel targets for this
1. `mvn compile exec:java`. This launches a local web server on port 8080.
2. In a browser, navigate to `localhost:8080`. This page provides a simple read–eval–print loop
and can also run all the unit tests.

### From the command line
TODO expose bazel targets for this
Run `make node-repl`. This launches a simple read–eval–print loop
directly in the terminal, using Node.
