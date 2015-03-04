package r5js;

import com.google.common.collect.ImmutableList;

import java.io.IOException;
import java.nio.file.Path;

enum Platform {
    ANDROID(
            compilationUnit("r5js-android.js", "r5js.test.main")),
    HTML5(
            compilationUnit("r5js-html5.js", "r5js.test.main"),
            compilationUnit("r5js-worker.js", "r5js.platform.html5.Worker")),
    NODE(
            compilationUnit("r5js-node.js", "r5js.test.main"));

    final ImmutableList<CompilationUnit.Input> inputs;

    Platform(CompilationUnit.Input... inputs) {
        this.inputs = ImmutableList.copyOf(inputs);
    }

    boolean relevant(Path path) {
        return path.getFileName().toString().endsWith(".js")
                && (path.startsWith("closure-library")
                || (path.startsWith("src/js") && isRelevantSourcePath(path)));
    }

    private boolean isRelevantSourcePath(Path path) {
        if (!path.startsWith("src/js/platform")) {
            return true;
        }

        Path parent = path.getParent();
        return parent.endsWith("platform") || parent.endsWith(toString().toLowerCase());
    }

    ImmutableList<CompilationUnit.Output> build() throws IOException {
        return SchemeEngineBuilder.build(this);
    }

    private static CompilationUnit.Input compilationUnit(
            String buildArtifactName, String closureEntryPoint) {
        return new CompilationUnit.Input(buildArtifactName, closureEntryPoint);
    }
}
