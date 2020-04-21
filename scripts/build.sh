# https://github.com/emscripten-core/emscripten/blob/master/src/settings.js

emcc -O2 \
    deps/oniguruma/src/.libs/libonig.so \
    src/onig.cc\
    -Isrc -Ideps/oniguruma/src \
    -o out/onig.js \
    -s ENVIRONMENT=shell \
    -s FILESYSTEM=0 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME=Onig \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s EXTRA_EXPORTED_RUNTIME_METHODS="['UTF8ToString']"
