# Menu API

An express server that can serves WordPress menu.


## Development

### Prerequisite

* access to the wp-veritas API
* some dev sites running:
    * wp-httpd
    * wp-httpd/campus
    * wp-httpd/campus/services
    * wp-httpd/campus/services/websites

### Environment variables

Environment variables are declared in the 
- `.env.dev` file for local tests. Make sure to put right variables
- `.env.test` file for wp-httpd container test
- prod environment variables are declared inside ansible

## Run tests locally

To run tests locally:
`npm test`

### NodeJS

* `npm i`
* Start the server locally:
  ```
  npm start
  ```

* open your browser on
    * http://localhost:3001/menus/breadcrumb/?lang=en&url=http://wp-httpd/campus/services/en/it-services/security-it/
    * http://localhost:3001/menus/siblings/?lang=en&url=http://wp-httpd/campus/services/en/it-services/security-it/

### Docker

Inside wp-dev run:
* If containers are already running: `make stop`
* To refresh the image of the menu-api we need to delete it: `docker compose build menu-api`
* Run `make up` to rebuild automatically the new image and run all containers
* Then you can use `docker logs -f menu-api`
* And then to test inside the meni-api container:
```
docker exec -it menu-api curl http://localhost:3001/refresh ; docker exec -it menu-api curl http://localhost:3001/details\?type\=breadcrumb\&lang\=en\&url\=http://wp-httpd/campus/services/website/
```

_**N.B.**: The test container (wp-httpd) will take the `.env.test` file for environment variables as it is configured 
in the **docker-compose.yml** file.
Then the Dockerfile of the **menu-api** will be executed and so the `npm start`._

