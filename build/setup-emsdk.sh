mkdir -p /opt/dev \
&& cd /opt/dev \
&& git clone https://github.com/emscripten-core/emsdk.git \
&& cd /opt/dev/emsdk \
&& git reset --hard 0fde04880048f743056bed17cb0543a42e040fae \
&& ./emsdk install 3.1.45 \
&& ./emsdk activate 3.1.45
