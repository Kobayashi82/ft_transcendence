FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG API_URL
ENV VITE_API_URL=${API_URL}

RUN npm run build

FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

ENV NODE_ENV=production

RUN echo \
'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
