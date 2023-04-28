FROM mcr.microsoft.com/playwright:v1.32.0-jammy

WORKDIR /usr/src/app

RUN mkdir /video
COPY package*.json ./
COPY tsconfig*.json ./

RUN yarn install

COPY . ./

RUN yarn install

# Pre-compile typescript
RUN yarn run docker-build

CMD ["/bin/sh", "-c", "xvfb-run -a yarn run docker-run"]
