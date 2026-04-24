FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-noto-cjk \
    ca-certificates \
    python3 \
    python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir --break-system-packages edge-tts

WORKDIR /app
COPY package.json ./
COPY server.mjs ./

ENV PORT=8080
ENV FFMPEG_PATH=ffmpeg
ENV FONT_FILE=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc

EXPOSE 8080
CMD ["node", "server.mjs"]
