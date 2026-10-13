FROM node:24-bookworm-slim
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/src ./src
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/data/skillpacket.sqlite
EXPOSE 3001
CMD ["npm", "start"]
