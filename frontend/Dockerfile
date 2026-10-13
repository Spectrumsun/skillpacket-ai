FROM node:24-bookworm-slim AS build
WORKDIR /app
# The frontend imports shared contracts from its sibling backend directory.
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci
COPY backend/src ./backend/src
COPY frontend ./frontend
RUN npm --prefix frontend run build

FROM nginx:stable-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
# Only substitute the server-side token; preserve nginx variables such as $uri.
ENV NGINX_ENVSUBST_FILTER=^API_TOKEN$
EXPOSE 8080
