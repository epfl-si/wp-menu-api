FROM node:20-alpine
RUN apk --no-cache add curl

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN mkdir ./data
RUN chmod 1777 ./data

RUN npm install

RUN chmod 1777 .    # BAD!!! Better to dedicate a directory for the JSON file.

CMD ["/app/node_modules/.bin/ts-node", "./src/app.ts", "-p", "/config/menu-api-config.yaml"]
