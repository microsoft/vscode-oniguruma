mkdir -p /opt/dev \
&& cd /opt/dev \
&& git clone https://github.com/emscripten-core/emsdk.git \
&& cd /opt/dev/emsdk \
&& ./emsdk install 3.1.45 \
&& ./emsdk activate 3.1.45
