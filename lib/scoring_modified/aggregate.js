'use strict';

const couchdbIterator = require('couchdb-iterator');
const promiseRetry = require('promise-retry');
const flattenObject = require('obj-flatten');
const unflattenObject = require('obj-unflatten');
const mapValues = require('lodash/mapValues');
const mean = require('lodash/mean');
const objGet = require('lodash/get');

const trimPercentage = 0.01;  // Trim evaluations % to normalize skewness of values when aggregating
const log = logger.child({ module: 'scoring_modified/aggregate' });

/**
 * Calculates the aggregation based on the accumulated evaluations.
 *
 * @param {array} evaluations The accumulated evaluations
 *
 * @return {object} The aggregation object
 */
function calculateAggregation(evaluations) {
    const shape = flattenObject(evaluations[0] || {});

    const grouped = mapValues(shape, (value, key) => {
        return evaluations
        .map((evaluation) => objGet(evaluation, key))
        // All the packages with negative values will have a score of 0 (e.g.: downloads acceleration)
        // So, we must remove all negative values from the aggregation in order to have a better score curve
        .filter((evaluation) => evaluation >= 0)
        .sort((a, b) => a - b);
    });

    const aggregation = mapValues(grouped, (evaluations) => {
        const trimmedLength = Math.round(evaluations.length * trimPercentage);

        return {
            min: evaluations[0],
            max: evaluations[evaluations.length - 1],
            mean: mean(evaluations),
            truncatedMean: mean(evaluations.slice(trimmedLength, -trimmedLength)),
            median: evaluations[Math.round(evaluations.length / 2)],
        };
    });

    return unflattenObject(aggregation);
}

// ---------------------------------------------------------

/**
 * Gets the last aggregation.
 *
 * @param {Nano} npmsNano The npms nano client instance
 *
 * @return {Promise} The promise that fulfills when done
 */
function get(npmsNano) {
    log.trace('Getting aggregation');

    return npmsNano.getAsync('scoring!aggregation')
    .catch({ error: 'not_found' }, () => {
        throw Object.assign(new Error('Aggregation not found, it appears that the first scoring cycle has not yet run'),
            { code: 'AGGREGATION_NOT_FOUND' });
    });
}

/**
 * Removes a last aggregation.
 *
 * @param {Nano} npmsNano The client nano instance for npms
 *
 * @return {Promise} The promise that fulfills when done
 */
function remove(npmsNano) {
    return promiseRetry((retry) => {
        return get(npmsNano)
        .then((doc) => {
            return npmsNano.destroyAsync(doc._id, doc._rev)
            .catch({ error: 'conflict' }, (err) => {
                err = new Error('Conflict while removing aggregation');
                log.warn({ err }, err.message);
                retry(err);
            });
        });
    })
    .catch({ code: 'AGGREGATION_NOT_FOUND' }, () => {})
    .then(() => log.trace('Aggregation removed'));
}

/**
 * Saves aggregation.
 *
 * @param {object} aggregation The aggregation (can be the full doc to avoid having to fetch it)
 * @param {Nano}   npmsNano    The client nano instance for npms
 *
 * @return {Promise} The promise that fulfills when done
 */
function save(aggregation, npmsNano) {
    return promiseRetry((retry) => {
        // Fetch the doc if necessary to obtain its rev
        return Promise.try(() => {
            if (aggregation._rev) {
                return;
            }

            return get(npmsNano)
            .then((doc) => { aggregation._rev = doc._rev; })
            .catch({ code: 'AGGREGATION_NOT_FOUND' }, () => {});
        })
        // Save it
        .then(() => {
            aggregation._id = 'scoring!aggregation';

            return npmsNano.insertAsync(aggregation)
            .tap((response) => { aggregation._rev = response.rev; })
            .catch({ error: 'conflict' }, (err) => {
                err = new Error('Conflict while storing aggregation');
                log.warn({ err }, err.message);

                delete aggregation._rev;
                retry(err);
            });
        });
    })
    .return(aggregation)
    .tap(() => log.trace({ aggregation }, 'Saved aggregation'));
}

/**
 * Iterates over all packages evaluations, producing an aggregation (aka reduce) of all scalar values in it,
 * including the min, max and mean values for each metric.
 *
 * @param {Nano} npmsNano The npms nano client instance
 *
 * @return {Promise} The promise that fulfills when done
 */
function aggregate(inputFile, outputFile) {
    const evaluations = [];

    log.info('Starting aggregation');

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

        const data = JSON.parse(line);
        const evaluation = data.evaluation;
        evaluations.push(evaluation);
    });

    rl.on('close', function (line) {
        log.info('done reading file.');
        const evaluationsCount = evaluations.length;
        if (!evaluationsCount) {
            log.debug('There are no evaluations yet');
            return null;
        }
        log.info(`Accumulated a total of ${evaluationsCount} evaluations, calculating aggregation..`);

        const aggregation = calculateAggregation(evaluations);

        log.info({ aggregation }, 'Aggregation calculated, saving it..');

        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile, (err) => {
                if (err) throw err;
            });
        }

        fs.appendFile(outputFile, JSON.stringify(aggregation), (err) => {
            if (err) throw err;
        });

    });

}


module.exports = aggregate;
module.exports.get = get;
module.exports.save = save;
module.exports.remove = remove;
