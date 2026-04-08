# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_BROUTER_DIRECT_URL=/brouter
ENV VITE_BROUTER_DIRECT_URL=$VITE_BROUTER_DIRECT_URL
ARG VITE_PRIVACY_CONTENT
ENV VITE_PRIVACY_CONTENT=$VITE_PRIVACY_CONTENT
ARG VITE_IMPRESSUM_CONTENT
ENV VITE_IMPRESSUM_CONTENT=$VITE_IMPRESSUM_CONTENT
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# SSL configuration
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=DE/ST=Bavaria/L=Munich/O=Bicly/CN=localhost"

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
