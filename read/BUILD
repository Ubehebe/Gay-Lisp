load("@npm_bazel_typescript//:defs.bzl", "ts_library")

package(
    default_visibility = [
        "//:__subpackages__",
    ],
)

ts_library(
    name = "read",
    srcs = glob(["*.ts"]),
    tsconfig = "//:tsconfig.json",
    deps = [
        "//ast:datum",
        "//base:error",
        "//parse:nonterminals",
        "//parse:terminals",
        "//scan",
    ],
)
