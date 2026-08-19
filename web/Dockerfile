# 先 build 出 dist，再交給 nginx 提供靜態檔（正式環境不跑 Vite）。
FROM node:22-alpine AS build
WORKDIR /app
# 先只複製 lockfile，套件沒變時 Docker 才會沿用這層 cache
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 第二階段：只帶走編譯結果，映像比較小
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
