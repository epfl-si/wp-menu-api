# Menu API

An express server that can serves WordPress menu.

## Development

### Environment variables

Environment variables are declared in the `menu-api-config.yaml`
- prod environment variables are declared inside ansible

### Run menu-api on localhost
- On your terminal :
  - `npm i` the first time you run the project
  - Connect to Openshift test environment
  - `oc port-forward service/wp-nginx 8000:80`
  - `npm start`

## Run tests locally

To run tests locally:
`npm test` (some test could fail if the site doesn't exist in test environment)

### Deployement on Openshift 4 - test/prod
Follow the doc at https://docs.google.com/document/d/11Kxg4IWH7tMZk_lxds5NsvrYTSU0Pr0PIfKgXcIv-6w/edit?pli=1&tab=t.0
