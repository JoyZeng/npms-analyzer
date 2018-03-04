'use strict';

const evaluate = require('../../lib/analyze/evaluate');
const stats = require('../util/stats');

const log = logger.child({ module: 'cli/evaluate-from-raw-data' });

function processFile(inputFile, outputFile) {
    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        const data = {"analyzedAt":"2018-03-03T00:16:46.309Z","collected":{"metadata":{"name":"8-ball-pool-unlimited-coins-and-cash","scope":"unscoped","version":"4.0.5","description":"8-ball-pool-unlimited-coins-and-cash","date":"2018-03-03T00:16:38.128Z","publisher":{"username":"biwo","email":"woritop@ugimail.net"},"maintainers":[{"username":"biwo","email":"woritop@ugimail.net"}],"links":{"npm":"https://www.npmjs.com/package/8-ball-pool-unlimited-coins-and-cash"},"license":"ISC","releases":[{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2016-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1}],"readme":"<h3>The Best Tool Ever!!! - 8 Ball Pool Hack Coins Cheats Tool 2018. </h3><p>\r\nHello, These days I will show you 8 Ball Pool Cheats Hack Tool that will give you Limitless Coins in the game. You can MAX Everything, Unlock Almost everything with our web hack tool! This hack tool is supported on all Android & iOS devices! Just enter your username and BOOM Unlimited every little thing! Try it out now! Follow the Link down below to get your free Coins :\r\n</p>\r\n<p><center><a href=\"http://8-ball-pool.triches.cf/en.html\" rel=\"nofollow\"><img src=\"https://i.imgur.com/pBj3Onn.gif\"></a></center></p>"},"npm":{"downloads":[{"from":"2018-03-02T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":0},{"from":"2018-02-24T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":24},{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":85},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118}],"dependentsCount":0,"starsCount":0},"source":{"files":{"readmeSize":594,"testsSize":0}}},"evaluation":{"quality":{"carefulness":0.71,"tests":0,"health":1,"branding":0},"popularity":{"communityInterest":0,"downloadsCount":39.333333333333336,"downloadsAcceleration":0.710578386605784,"dependentsCount":0},"maintenance":{"releasesFrequency":0.7591609589041095,"commitsFrequency":0,"openIssues":0,"issuesDistribution":0}},"score":{"final":0.27357862943702893,"detail":{"quality":0.5116017882410031,"popularity":0.011026362644692244,"maintenance":0.3321110458259593}}}

        const name = data.collected.metadata.name;

        log.debug(`Evaluating ${name}..`);

        const evaluation = evaluate(data.collected);

        log.info(evaluation);

        fs.appendFile('feature_value.txt', JSON.stringify(evaluation) + '\n', (err) => {
            if (err) log.error('package ' + name + ' failed. ' + err);
        });
    });

    rl.on('close', function (line) {
        log.info('done reading file.');
    });
}


exports.command = 'evaluate-from-raw-data [options]';
exports.describe = 'Iterates over all raw data collected from npms api.';

exports.builder = (yargs) =>
yargs
    .usage('Usage: $0 tasks evaluate-from-raw-data [options]\n\n\
Iterates over all raw data collected from npms api.');

exports.handler = (argv) => {
    process.title = 'npms-analyzer-evaluate-from-raw-data';
    logger.level = argv.logLevel || 'info';

    log.info('Starting packages evaluation from raw data');

    processFile('/Users/Joy/Documents/Concordia/npms/npms-analyzer/cmd/tasks/evaluate-from-raw-data.js');

};
