'use strict';

const score = require('../../lib/scoring_modified/score');
const fs = require('fs');
const log = logger.child({ module: 'cli/calculate-score' });

function getAggregation(inputFile) {
    const text = fs.readFileSync(inputFile);
    return JSON.parse(text);
}


function calculateScoreWithAggregation(inputFile, aggregationFile) {
    const aggregation = getAggregation(aggregationFile);

    var readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        if (line == '') {
            return;
        }
        const data = JSON.parse(line);
        const finalScore = score(data, aggregation);
        // TODO: save it to file
    });

    rl.on('close', function (line) {
        log.info('done reading file.');
    });
}

exports.command = 'calculate-score [options]';
exports.describe = 'Calculate score with aggregation.';

exports.builder = (yargs) =>
yargs
    .usage('Usage: $0 tasks calculate-score [options]\n\n\
Calculate score with aggregation.');

exports.handler = (argv) => {
    process.title = 'npms-analyzer-calculate-score';
    logger.level = argv.logLevel || 'info';

    log.info('Starting packages calculate score');

    calculateScoreWithAggregation('npms-api-data.txt', 'aggregation_from_api.json');

    // calculateScoreWithAggregation('npms-modified-data.txt', 'aggregation_modified.json');

};
