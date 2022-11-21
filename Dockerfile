FROM node:19-alpine

EXPOSE 3000

WORKDIR /app

COPY *.json *.js /app/

RUN npm install

CMD [ "node", "librus-calendar.js" ]