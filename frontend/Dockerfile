FROM node:18-alpine as build

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Set environment variable for React build to point to the nginx proxy
ENV REACT_APP_API_URL=/api

# Build the app
RUN npm run build

# Nginx stage to serve static files and proxy API requests
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
