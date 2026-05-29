FROM node:20-alpine AS builder

WORKDIR /app

# Copy ONLY package files first — layer cached until these change
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci --legacy-peer-deps

# Copy source code and build
COPY . .
RUN npm run build


# Production stage: lightweight nginx serving static files only
FROM nginx:alpine

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
