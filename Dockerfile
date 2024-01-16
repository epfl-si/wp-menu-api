FROM node:18
RUN mkdir /app
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install

CMD ["npm", "start"]
