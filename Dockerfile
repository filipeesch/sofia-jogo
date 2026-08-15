# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
# Force the public npm registry (the device's internal Nexus mirror returns
# 403 for some packages like vite). Command-line flag has highest precedence.
COPY package*.json ./
RUN npm ci --registry=https://registry.npmjs.org/
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
