FROM node:20-alpine
RUN apk --no-cache add curl

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY menu-api-config.yaml ./

RUN npm install
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN chmod 1777 .    # BAD!!! Better to dedicate a directory for the JSON file.

CMD ["/app/node_modules/.bin/ts-node", "./src/app.ts", "-p", "./menu-api-config.yaml"]
