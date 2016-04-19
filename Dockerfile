FROM node:5

RUN mkdir -p /src
WORKDIR /src
VOLUME /src

COPY ./docker/node-entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8080
