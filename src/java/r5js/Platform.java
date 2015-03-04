package r5js;

import com.google.common.collect.ImmutableList;

import java.io.IOException;
import java.nio.file.Path;

enum Platform {
    ANDROID(ImmutableList.of("r5js.test.main")),
    HTML5(ImmutableList.of("r5js.test.main", "r5js.platform.html5.Worker")),
    NODE( ImmutableList.of("r5js.test.main"));

    final ImmutableList<String> closureEntryPoints;

    Platform(ImmutableList<String> closureEntryPoints) {
        this.closureEntryPoints = closureEntryPoints;
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

    byte[] build() throws IOException {
        return SchemeEngineBuilder.build(this);
    }
}
