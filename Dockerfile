# syntax=docker/dockerfile:1

# ---- Build the Angular app ---------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# ---- Serve it with nginx (non-root, port 8080) --------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/incident-reporting-frontend/browser /usr/share/nginx/html
EXPOSE 8080
