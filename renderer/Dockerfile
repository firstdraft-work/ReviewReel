FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-noto-cjk ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY server.mjs ./

ENV PORT=8080
ENV FFMPEG_PATH=ffmpeg
ENV FONT_FILE=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc

EXPOSE 8080
CMD ["node", "server.mjs"]
