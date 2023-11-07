# Menu API

An express server that can serves WordPress menu.


## Development

* `docker build -t epflsi/menu-api .`
* `docker run --name menu-api -it -p 8888:3000 epflsi/menu-api`
* `docker rm -f menu-api && docker build -t epflsi/menu-api . && docker run -d --name menu-api -it -p 8888:3000 epflsi/menu-api`
* Then use `docker logs -f menu-api`
* And then to test in the meni-api container:
```
docker exec -it menu-api curl http://localhost:3001/refreshMenus ; docker exec -it menu-api curl http://localhost:3001/details\?type\=breadcrumb\&lang\=en\&url\=http://wp-httpd/campus/services/website/
```
