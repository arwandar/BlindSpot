FROM node:latest

ENV NODE_ENV="production"

WORKDIR /app
COPY package*.json ./
# This line was changed
RUN npm install --production=false 
COPY . .
# Don't forget to run the build after installing dependencies
RUN npm run build
EXPOSE 5174
CMD [ "npm", "start" ]