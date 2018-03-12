# Setting

## CouchDB

- Install [CouchDB](http://couchdb.apache.org/) and run it (tested with `v1.6.1`).
- Create database named `npms-modified` by executing `curl -X PUT http://admin:admin@localhost:5984/npms-modified`
- Setup the necessary views by creating the document `_design/npms-analyzer` in the `npms-modified` database with the contents of `https://github.com/npms-io/npms-analyzer/blob/master/config/couchdb/npms-analyzer.json`


## Elasticsearch

- Change these configurations in the `elasticsearch.yml`:
  - `action.auto_create_index: -npms-current,-npms-new,-npms-modified-current,-npms-modified-new,+*`
  

# Calculate score

## Save original evaluation to couchdb
- Edit cmd/tasks/save-data-to-couchdb.js, set `inputFile` path to api data.
- Run 'cli.js tasks save-data-to-couchdb | pino'

## Save modified evaluation to couchdb
- Edit cmd/tasks/save-modified-data-to-couchdb.js, set `inputFile` path to api data.
- Run 'cli.js tasks save-modified-data-to-couchdb | pino'

## Run original scoring
- Run 'cli.js scoring | pino'

## Run modified scoring
- Run 'cli.js scoring-modified | pino'

# Run website

## Run original api
- `git clone https://github.com/npms-io/npms-api.git`
- `npm install`
- `npm run start-dev`

## Run original www
- `git clone https://github.com/npms-io/npms-www.git`
- `npm install`
- Edit 'config/webpack.config.js', change `target` and `headers` to `localhost:3000`
- Edit 'src/routes/search/components/ResultsList.js' and 'src/routes/search/components/ResultsListItem.js', change `apiUrl` to `localhost:3000`
- `npm run serve`

## Run modified api
- `git clone https://github.com/npms-io/npms-api.git modified-npms-api`
- `npm install`
- Edit 'config/default.json5', change 'couchdbNpms' url to `http://admin:admin@127.0.0.1:5984/npms-modified`, listen to `3001`
- Edit 'index.js', change `npms-api` to `npms-modified-api`
- Edit 'lib/routes/package/info.js', change `npms-current` to `npms-modified-current`
- Go to 'node_modules/@npms/queries/lib', edit 'search.js', 'searchSimilar.js', 'searchSuggestions.js', change `npms-current` to `npms-modified-current` 
- `npm run start-dev`

## Run modified www
- `git clone https://github.com/npms-io/npms-www.git modified-npms-www`
- `npm install`
- Edit 'config/webpack.config.js', change `target` and `headers` to `localhost:3001`
- Edit 'scripts/serve', change `8080` to `8081`
- Edit 'src/routes/search/components/ResultsList.js' and 'src/routes/search/components/ResultsListItem.js', change `apiUrl` to `localhost:3001`
- `npm run serve`




