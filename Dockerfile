FROM node:18-alpine

RUN apk add --no-cache postgresql-client

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 12000

CMD [ "npm", "start" ]
