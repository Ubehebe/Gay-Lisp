version = `cat VERSION`
output = build/gay-lisp-$(version).js
unit_tests = build/unit_tests.scm

# Closure Library-related paths.
closure_root = closure-library
closure_bin  = $(closure_root)/closure/bin/build
builder      = $(closure_bin)/closurebuilder.py
depswriter   = $(closure_bin)/depswriter.py

# Closure Compiler-related paths.
compiler_jar  = closure-compiler/build/compiler.jar
compiler      = java -client -XX:+TieredCompilation -jar $(compiler_jar)

# Input-related paths.
src = src/js

# Output-related paths.
main_class = r5js.main
outdir = build
deps = $(outdir)/deps.js

# Static server-related paths.
static_port = 8888
static_root = http://localhost:$(static_port)

# Test-related paths.
test_main_class = r5js.test.main
phantom_driver  = src/js/tdd/phantom_driver.js
test_url = $(static_root)/src/js/test/test.html
# test_opts can be overridden from the command line. Example:
# make test test_opts="--type=integration --verbose"
test_opts = --type=unit

.PHONY: deps
deps:
	@mkdir -p $(outdir)
	@$(depswriter) --root_with_prefix="$(src) ../../../$(src)" > $(deps)

.PHONY: repl-closurized
repl-closurized: interpreter-closurized
repl-closurized:
	cat ui/index.html | sed -e "s/gay-lisp\.js/gay-lisp-$(version).js/g" > build/index.html
	cp ui/main.js ui/repl.css build/
	cp mockterm/mockterm.js mockterm/async_queue.js build/
	cp tutorial/*.js build/

.PHONY: typecheck
typecheck:
	@find $(src) -name "*.js" \
	| xargs printf "\-\-input %s " \
	| xargs $(builder) --root=$(src) --root=$(closure_root) \
	| xargs printf "\-\-js %s " \
	| xargs $(compiler) \
		--js src/api/api.js \
		--js $(closure_root)/closure/goog/deps.js \
		--warning_level VERBOSE \
		--jscomp_error accessControls \
		--jscomp_error ambiguousFunctionDecl \
		--jscomp_error checkRegExp \
		--jscomp_error checkTypes \
		--jscomp_error checkVars \
		--jscomp_error const \
		--jscomp_error constantProperty \
		--jscomp_error deprecated \
		--jscomp_error duplicateMessage \
		--jscomp_error globalThis \
		--jscomp_error internetExplorerChecks \
		--jscomp_error invalidCasts \
		--jscomp_error misplacedTypeAnnotation \
		--jscomp_error missingProperties \
		--jscomp_error nonStandardJsDocs \
		--jscomp_error suspiciousCode \
		--jscomp_error strictModuleDepCheck \
		--jscomp_error typeInvalidation \
		--jscomp_error undefinedNames \
		--jscomp_error undefinedVars \
		--jscomp_error unknownDefines \
		--jscomp_error uselessCode \
		--jscomp_error visibility \
		> /dev/null

.PHONY: interpreter-closurized
interpreter-closurized: doctor-api-js
interpreter-closurized:
	@mkdir -p $(outdir)/tmpdir
	@mv $(output) $(outdir)/tmpdir/tmp.js
	@find $(src) -name "*.js" \
	| xargs printf "\-\-input %s " \
	| xargs $(builder) --root=$(src) --root=$(closure_root) \
	| xargs $(compiler) \
		--js $(closure_root)/closure/goog/deps.js \
		--js $(outdir)/tmpdir/tmp.js \
		--closure_entry_point=$(main_class) \
		> $(output)
	@rm -rf $(outdir)/tmpdir

.PHONY: doctor-api-js
doctor-api-js: firstBrace = `grep -m1 -A1 -n { src/api/api.js | head -1 | sed -e 's/^\([0-9]*\).*/\1/'`
doctor-api-js: afterFirstBrace = `grep -m1 -A1 -n { src/api/api.js | tail -1 | sed -e 's/^\([0-9]*\).*/\1/'`
doctor-api-js: banner_src = src/banner.txt
doctor-api-js:
	@mkdir -p build
	@head -n$(firstBrace) src/api/api.js > $(output)
	@echo "\nvar syntax = \"\c" >> $(output)
	@# Remove Scheme comments, escape Scheme backslashes and quotes, compress whitespace
	@# (Note that we compress whitespace inside string literals, which is not really correct...)
	@sed -e 's/;.*//' -e 's/\\/\\\\/g' -e 's/\"/\\\"/g' < src/scm/r5rs-syntax.scm | tr -s '\n\t ' ' ' >> $(output)
	@echo "\";" >> $(output)
	@echo "var procedures = \"\c" >> $(output)
	@sed -e 's/;.*//' -e 's/\\/\\\\/g' -e 's/\"/\\\"/g' < src/scm/r5rs-procedures.scm | tr -s '\n\t ' ' ' >> $(output)
	@echo "\";" >> $(output)

	@# Embed the banner
	@echo "\nvar banner = \"\c" >> $(output)

	@cp $(banner_src) build/tmp
	@echo "\n;; Version $(version) (source commit \c" >> build/tmp
	@cat .git/refs/heads/master | sed -e 's/\(.\{7\}\).*/\1)/' >> build/tmp
	@echo ";; Built on \c" >> build/tmp
	@echo `date` >> build/tmp
	@cat build/tmp | sed -e 's/\\/\\\\/g' -e 's/\"/\\\"/g' | awk '{ printf "%s\\n", $$0}' >> $(output)
	@echo "\";" >> $(output)
	@rm build/tmp

	@# TODO bl: tail -n+$(afterFirstBrace) used to start with the line after
	@# the brace, but now, at least on OS X, it grabs the line including
	@# the brace, leading to very malformed output. The tail -n+2 corrects
	@# for this. This could be a version problem with one of the command-line
	@# tools. Investigate.
	@tail -n+$(afterFirstBrace) src/api/api.js | tail -n+2 >> $(output)
	@cat test/framework/* | sed -e 's/;.*//' | tr -s '\n\t ' ' ' >> $(unit_tests)
	@cat test/*.scm | sed -e 's/;.*//' | tr -s '\n\t ' ' ' >> $(unit_tests)

.PHONY: test-closurized
test-closurized: deps interpreter-closurized
test-closurized:
	@command -v python > /dev/null 2>&1 || \
		{ echo >&2 "python is required for testing."; exit 1; }
	@command -v phantomjs >/dev/null 2>&1 || \
		{ echo >&2 "phantomjs is required for testing."; exit 1; }
	@python -m SimpleHTTPServer $(static_port) > /dev/null 2>&1 & echo "$$!" > python.pid
	@phantomjs $(phantom_driver) $(test_url) $(test_main_class) $(test_opts)
	@-cat python.pid | xargs kill
	@rm python.pid

.PHONY: clean
clean:
	@rm -rf $(outdir)