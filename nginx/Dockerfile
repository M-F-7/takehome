FROM nginx:alpine

# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy frontend static files into the image
COPY frontend /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
