FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN npm install express body-parser

# Copy server
COPY server.js .

EXPOSE 8080

CMD ["node", "server.js"]