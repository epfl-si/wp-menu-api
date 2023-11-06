# Menu API

An express server that can serves WordPress menu.


## Development

* `docker build -t epflsi/menu-api .`
* `docker run --name menu-api -it -p 8888:3000 epflsi/menu-api`
* `docker rm -f menu-api && docker build -t epflsi/menu-api . && docker run -d --name menu-api -it -p 8888:3000 epflsi/menu-api`
* Then use `docker logs -f menu-api`


### Test

```
curl http://localhost:8888/breadcrumb?lang=fr&url=https://www.epfl.ch/campus/services/website/
```
or
```
php test.php
```

### To start the server locally
```
npx ts-node src/app.ts
```
### To start wp-dev and menu-api in the container
```
make down; \
docker rmi wp-local-menu-api:latest; \
make up
```
And then to test in the meni-api container:
```
docker exec -it menu-api curl http://localhost:3001/refreshMenus ; docker exec -it menu-api curl http://localhost:3001/details\?type\=breadcrumb\&lang\=en\&url\=http://wp-httpd/campus/services/website/
```
And to see logs:
```
docker logs -f menu-api
```
