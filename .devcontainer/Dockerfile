#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:18

RUN mkdir -p /opt/dev \
    && cd /opt/dev \
    && git clone https://github.com/emscripten-core/emsdk.git \
    && cd /opt/dev/emsdk \
    && ./emsdk install 3.1.59 \
    && ./emsdk activate 3.1.59

ENV PATH="/opt/dev/emsdk:/opt/dev/emsdk/upstream/emscripten:${PATH}"
