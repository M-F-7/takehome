FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
RUN npm install
COPY index.html ./
COPY src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
