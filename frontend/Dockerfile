# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_BROUTER_DIRECT_URL=/brouter
ENV VITE_BROUTER_DIRECT_URL=$VITE_BROUTER_DIRECT_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Install logrotate and setup cron
RUN apk add --no-cache logrotate && \
    mkdir -p /var/log/brouter && \
    rm -f /var/log/nginx/access.log /var/log/nginx/error.log

# Configure logrotate
RUN echo -e "/var/log/nginx/*.log /var/log/brouter/*.log {\n\
    daily\n\
    rotate 30\n\
    missingok\n\
    notifempty\n\
    compress\n\
    delaycompress\n\
    copytruncate\n\
}" > /etc/logrotate.d/bicly

# SSL configuration
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=DE/ST=Bavaria/L=Munich/O=Bicly/CN=localhost"

EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
