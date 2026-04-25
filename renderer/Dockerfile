FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-noto-cjk \
    fontconfig \
    ca-certificates \
    python3 \
    python3-pip \
    curl \
  && rm -rf /var/lib/apt/lists/* \
  && pip3 install --no-cache-dir --break-system-packages edge-tts \
  && mkdir -p /usr/share/fonts/truetype/noto \
  && curl -sL "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf" \
    -o /usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf \
  && fc-cache -f

WORKDIR /app
COPY package.json ./
COPY server.mjs ./

ENV PORT=8080
ENV FFMPEG_PATH=ffmpeg
ENV FONT_FILE=/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf

EXPOSE 8080
CMD ["node", "server.mjs"]
