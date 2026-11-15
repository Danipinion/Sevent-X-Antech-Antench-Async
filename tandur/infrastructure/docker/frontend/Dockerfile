# ==========================================
# Frontend Dockerfile for TANDUR Web
# ==========================================

# 1. Development Target
FROM node:22-alpine AS dev
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# 2. Builder Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

# 3. Production Runtime
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

