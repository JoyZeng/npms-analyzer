'use strict';

const assert = require('assert');
const config = require('config');
const analyze = require('../../lib/analyze');
const bootstrap = require('../util/bootstrap');
const stats = require('../util/stats');
const evaluate_modified = require('../../lib/analyze/evaluate_modified');


// Need JSON.parse & JSON stringify because of config reserved words
// See: https://github.com/lorenwest/node-config/issues/223
const blacklist = JSON.parse(JSON.stringify(config.get('blacklist')));
const githubTokens = config.get('githubTokens');
const log = logger.child({ module: 'cli/save-modified-data-to-couchdb' +
    '' });

/**
 * Handles a message.
 *
 * @param {object}  msg      The message
 * @param {Nano}    npmNano  The npm nano instance
 * @param {Nano}    npmsNano The npms nano instance
 * @param {Elastic} esClient The Elasticsearch instance
 *
 * @return {Promise} A promise that fulfills when consumed
 */
function onMessage(msg, npmNano, npmsNano, esClient) {
    const name = msg.data;

    // Check if this package is blacklisted
    const blacklisted = blacklist[name];

    if (blacklisted) {
        const err = Object.assign(new Error(`Package ${name} is blacklisted`), { code: 'BLACKLISTED', unrecoverable: true });

        return onFailedAnalysis(name, err, npmsNano, esClient)
        .catch(() => {});
    }

    log.info(`Processing package ${name}`);

    // Check if the package has been analyzed after it has been pushed to the queue
    return analyze.get(name, npmsNano)
    .catch({ code: 'ANALYSIS_NOT_FOUND' }, () => {})
    .then((analysis) => {
        if (analysis && Date.parse(analysis.startedAt) >= Date.parse(msg.pushedAt)) {
            log.info(`Skipping analysis of ${name} because it was already analyzed meanwhile`);
            return;
        }

        // If not, analyze it! :D
        return analyze(name, npmNano, npmsNano, {
            githubTokens,
            waitRateLimit: true,
            rev: analysis && analysis._rev,
        })
        // Score it to get a "real-time" feeling, ignoring any errors
        .then((analysis) => score(analysis, npmsNano, esClient).catch(() => {}))
        .catch({ code: 'PACKAGE_NOT_FOUND' }, () => score.remove(name, esClient))
        // Ignore unrecoverable errors, so that these are not re-queued
        .catch({ unrecoverable: true }, (err) => {
            return onFailedAnalysis(name, err, npmsNano, esClient)
            .catch(() => {});
        });
    });
}

function onFailedAnalysis(name, err, npmsNano, esClient) {
    // Save the failed analysis, by generating an empty analysis object with the associated error
    return analyze.saveFailed(name, err, npmsNano)
    // Score it to get a "real-time" feeling, ignoring any errors
    .then((analysis) => score(analysis, npmsNano, esClient).catch(() => {}));
}

// ----------------------------------------------------------------------------

exports.command = 'save-modified-data-to-couchdb' +
    ' [options]';
exports.describe = 'Starts observing module changes and pushes them into the queue';

exports.builder = (yargs) =>
    yargs
    .usage('Usage: $0 consume [options]\n\n\
Consumes packages that are queued, triggering the analysis process for each package.')

    .option('concurrency', {
        type: 'number',
        default: 5,
        alias: 'c',
        describe: 'Number of packages to consume concurrently',
    })

    .check((argv) => {
        assert(argv.concurrency > 0, 'Invalid argument: --concurrency must be a number greater than 0');
        return true;
    });

exports.handler = (argv) => {
    process.title = 'npms-analyzer-save-modified-data-to-couchdb' +
        '';
    logger.level = argv.logLevel || 'warn';

    // Bootstrap dependencies on external services

    const inputFile = 'npms-api-data.txt';
    bootstrap(['couchdbNpmsModified'], { wait: true })
    .spread((npmsNano) => {

        var fs = require('fs'),
            readline = require('readline'),
            instream = fs.createReadStream(inputFile),
            outstream = new (require('stream'))(),
            rl = readline.createInterface(instream, outstream);

        rl.on('line', function (line) {
            if (line == '') {
                return;
            }
            // const data = {"analyzedAt":"2018-03-03T00:16:46.309Z","collected":{"metadata":{"name":"8-ball-pool-unlimited-coins-and-cash","scope":"unscoped","version":"4.0.5","description":"8-ball-pool-unlimited-coins-and-cash","date":"2018-03-03T00:16:38.128Z","publisher":{"username":"biwo","email":"woritop@ugimail.net"},"maintainers":[{"username":"biwo","email":"woritop@ugimail.net"}],"links":{"npm":"https://www.npmjs.com/package/8-ball-pool-unlimited-coins-and-cash"},"license":"ISC","releases":[{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2016-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1}],"readme":"<h3>The Best Tool Ever!!! - 8 Ball Pool Hack Coins Cheats Tool 2018. </h3><p>\r\nHello, These days I will show you 8 Ball Pool Cheats Hack Tool that will give you Limitless Coins in the game. You can MAX Everything, Unlock Almost everything with our web hack tool! This hack tool is supported on all Android & iOS devices! Just enter your username and BOOM Unlimited every little thing! Try it out now! Follow the Link down below to get your free Coins :\r\n</p>\r\n<p><center><a href=\"http://8-ball-pool.triches.cf/en.html\" rel=\"nofollow\"><img src=\"https://i.imgur.com/pBj3Onn.gif\"></a></center></p>"},"npm":{"downloads":[{"from":"2018-03-02T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":0},{"from":"2018-02-24T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":24},{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":85},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118}],"dependentsCount":0,"starsCount":0},"source":{"files":{"readmeSize":594,"testsSize":0}}},"evaluation":{"quality":{"carefulness":0.71,"tests":0,"health":1,"branding":0},"popularity":{"communityInterest":0,"downloadsCount":39.333333333333336,"downloadsAcceleration":0.710578386605784,"dependentsCount":0},"maintenance":{"releasesFrequency":0.7591609589041095,"commitsFrequency":0,"openIssues":0,"issuesDistribution":0}},"score":{"final":0.27357862943702893,"detail":{"quality":0.5116017882410031,"popularity":0.011026362644692244,"maintenance":0.3321110458259593}}}

            const analysis = JSON.parse(line);
            const name = analysis.collected.metadata.name;

            log.debug(`Evaluating ${name}..`);

            const evaluation = evaluate_modified(analysis.collected);
            analysis.evaluation = evaluation;
            delete analysis.score;

            return analyze.save(analysis, npmsNano).then((analysis) => {
                log.debug({ analysis }, `Saved failed analysis of ${name}`);
                return analysis;
            }, (err) => {
                    log.error({ err }, `Error while saving failed analysis of ${name}`);
                    throw err;
            });
        });

        rl.on('close', function (line) {
            log.info('done reading file.');
        });
    })
    .done();

};
