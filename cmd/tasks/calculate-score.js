'use strict';

const score = require('../../lib/scoring_modified/score');
const fs = require('fs');
const log = logger.child({ module: 'cli/calculate-score' });

function getAggregation(inputFile) {
    const text = fs.readFileSync(inputFile);
    return JSON.parse(text);
}


function calculateScoreWithAggregation(inputFile, aggregationFile, outputFile) {
    const aggregation = getAggregation(aggregationFile);

    var readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile, (err) => {
            if (err) throw err;
    });
    }

    const header = 'package,evaluation_popularity_community_interest,evaluation_popularity_downloads_count,' +
        'evaluation_popularity_downloads_acceleration,evaluation_popularity_depends_count,evaluation_maintenance_releases_frequency,' +
        'evaluation_maintenance_commits_frequency,evaluation_maintenance_open_issues,evaluation_maintenance_issues_distribution,' +
        'evaluation_quality_carefulness,evaluation_quality_tests,evaluation_quality_health,evaluation_quality_branding,' +
        'aggregated_score_final,aggregated_score_popularity,aggregated_score_maintenance,aggregated_score_quality';

    fs.appendFile(outputFile, header + '\n', (err) => {
        if (err) throw err;
    });

    rl.on('line', function (line) {
        if (line == '') {
            return;
        }
        const lineObject = JSON.parse(line);
        const data = score(lineObject, aggregation);
        const name = lineObject.collected.metadata.name;
        const output_line = name + ',' + data.evaluation.popularity.communityInterest + ',' +
            data.evaluation.popularity.downloadsCount + ',' + data.evaluation.popularity.downloadsAcceleration + ',' +
            data.evaluation.popularity.dependentsCount + ',' + data.evaluation.maintenance.releasesFrequency + ',' +
            data.evaluation.maintenance.commitsFrequency + ',' + data.evaluation.maintenance.openIssues + ',' +
            data.evaluation.maintenance.issuesDistribution + ',' + data.evaluation.quality.carefulness + ',' +
            data.evaluation.quality.tests + ',' + data.evaluation.quality.health + ',' + data.evaluation.quality.branding + ',' +
            data.score.final + ',' + data.score.detail.popularity + ',' + data.score.detail.maintenance + ',' + data.score.detail.quality + ',';

        fs.appendFile(outputFile, output_line + '\n', (err) => {
            if (err) log.error('package ' + name + ' failed. ' + err);
        });
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

    calculateScoreWithAggregation('npms-api-data.txt', 'aggregation_api.json', 'score_api.csv');

    calculateScoreWithAggregation('npms-modified-data.txt', 'aggregation_modified.json', 'score_modified.csv');

};
