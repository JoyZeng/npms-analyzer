'use strict';

const measure = require('../../lib/analyze/measure');
const evaluate = require('../../lib/analyze/evaluate');
const evaluate_modified = require('../../lib/analyze/evaluate_modified');
const aggregate_modified = require('../../lib/scoring_save_to_file/aggregate');
const score = require('../../lib/scoring_save_to_file/score');
const weightedMean = require('weighted-mean');
const fs = require('fs');
const log = logger.child({ module: 'cli/evaluate-from-raw-data' });

function get_intermediate_metrics(inputFile, outputFile) {
    var readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    // print header
    const header = 'package,analyzed_at,evaluation_popularity_community_interest,evaluation_popularity_downloads_count,' +
        'evaluation_popularity_downloads_acceleration,evaluation_popularity_depends_count,evaluation_maintenance_releases_frequency,' +
        'evaluation_maintenance_commits_frequency,evaluation_maintenance_open_issues,evaluation_maintenance_issues_distribution,' +
        'evaluation_quality_carefulness,evaluation_quality_tests,evaluation_quality_health,evaluation_quality_branding,' +
        'aggregated_score_final,aggregated_score_popularity,aggregated_score_maintenance,aggregated_score_quality,' +
        'without_aggregated_score_final,without_aggregated_score_popularity,without_aggregated_score_maintenance,' +
        'without_aggregated_score_quality,' +
        'p_stars_count,p_forks_count,p_subscribers_count,p_contributors_count,p_downloads_count30,' +
        'p_downloads_acceleration_mean30,p_downloads_acceleration_mean90,p_downloads_acceleration_mean180,p_downloads_acceleration_mean365,' +
        'p_dependents_count,' +
        'm_release_frequency_mean30,m_release_frequency_mean180,m_release_frequency_mean365,m_release_frequency_mean730,' +
        'm_commits_frequency_mean30,m_commits_frequency_mean180,m_commits_frequency_mean365,m_is_issues_disabled,is_fork,' +
        'm_issues_count,m_issues_open_count,m_open_issues_ratio,m_issues_distribution_total_count,m_issues_distribution_open_mean_days,' +
        'm_package_is_stable,m_package_is_not_deprecated,m_package_has_few_issues,m_package_has_readme,m_package_has_tests,' +
        'q_license,q_readme_size,q_readme_evaluation,q_linters,q_ignore_file,q_changelog,q_is_deprecated,q_is_stable,q_tests_size,' +
        'q_tests_evaluation,q_coverage,q_status,q_outdated_count,q_dependencies_count,q_vulnerabilities_count,q_unlocked_count,' +
        'q_outdated_evaluation,q_vulnerabilities_evaluation,q_homepage,q_badges_count,q_badges_evaluation';

    fs.appendFile(outputFile, header + '\n', (err) => {
        if (err) throw err;
    });


    rl.on('line', function (line) {
        if (line == '') {
            return;
        }
        // const data = {"analyzedAt":"2018-03-03T00:16:46.309Z","collected":{"metadata":{"name":"8-ball-pool-unlimited-coins-and-cash","scope":"unscoped","version":"4.0.5","description":"8-ball-pool-unlimited-coins-and-cash","date":"2018-03-03T00:16:38.128Z","publisher":{"username":"biwo","email":"woritop@ugimail.net"},"maintainers":[{"username":"biwo","email":"woritop@ugimail.net"}],"links":{"npm":"https://www.npmjs.com/package/8-ball-pool-unlimited-coins-and-cash"},"license":"ISC","releases":[{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2016-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1}],"readme":"<h3>The Best Tool Ever!!! - 8 Ball Pool Hack Coins Cheats Tool 2018. </h3><p>\r\nHello, These days I will show you 8 Ball Pool Cheats Hack Tool that will give you Limitless Coins in the game. You can MAX Everything, Unlock Almost everything with our web hack tool! This hack tool is supported on all Android & iOS devices! Just enter your username and BOOM Unlimited every little thing! Try it out now! Follow the Link down below to get your free Coins :\r\n</p>\r\n<p><center><a href=\"http://8-ball-pool.triches.cf/en.html\" rel=\"nofollow\"><img src=\"https://i.imgur.com/pBj3Onn.gif\"></a></center></p>"},"npm":{"downloads":[{"from":"2018-03-02T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":0},{"from":"2018-02-24T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":24},{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":85},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118}],"dependentsCount":0,"starsCount":0},"source":{"files":{"readmeSize":594,"testsSize":0}}},"evaluation":{"quality":{"carefulness":0.71,"tests":0,"health":1,"branding":0},"popularity":{"communityInterest":0,"downloadsCount":39.333333333333336,"downloadsAcceleration":0.710578386605784,"dependentsCount":0},"maintenance":{"releasesFrequency":0.7591609589041095,"commitsFrequency":0,"openIssues":0,"issuesDistribution":0}},"score":{"final":0.27357862943702893,"detail":{"quality":0.5116017882410031,"popularity":0.011026362644692244,"maintenance":0.3321110458259593}}}

        const data = JSON.parse(line);
        const name = data.collected.metadata.name;

        log.debug(`Evaluating ${name}..`);

        const measurement = measure(data.collected);
        const evaluation = evaluate(data.collected);

        const without_aggregated_score_popularity = scorePopularity(evaluation.popularity);
        const without_aggregated_score_maintenance = scoreMaintenance(evaluation.maintenance);
        const without_aggregated_score_quality = scoreQuality(evaluation.quality);
        const without_aggregated_score_final = 0.3 * without_aggregated_score_quality + 0.35 * without_aggregated_score_popularity + 0.35 * without_aggregated_score_maintenance;

        const output_line = name + ',' + data.analyzedAt + ',' + data.evaluation.popularity.communityInterest + ',' +
            data.evaluation.popularity.downloadsCount + ',' + data.evaluation.popularity.downloadsAcceleration + ',' +
            data.evaluation.popularity.dependentsCount + ',' + data.evaluation.maintenance.releasesFrequency + ',' +
            data.evaluation.maintenance.commitsFrequency + ',' + data.evaluation.maintenance.openIssues + ',' +
            data.evaluation.maintenance.issuesDistribution + ',' + data.evaluation.quality.carefulness + ',' +
            data.evaluation.quality.tests + ',' + data.evaluation.quality.health + ',' + data.evaluation.quality.branding + ',' +
            data.score.final + ',' + data.score.detail.popularity + ',' + data.score.detail.maintenance + ',' + data.score.detail.quality + ',' +
            without_aggregated_score_final + ',' + without_aggregated_score_popularity + ',' + without_aggregated_score_maintenance + ',' +
            without_aggregated_score_quality + ',' +
            measurement.popularity.stars_count + ',' + measurement.popularity.forks_count + ',' +
            measurement.popularity.subscribers_count + ',' + measurement.popularity.contributors_count + ',' + measurement.popularity.downloads_count30 + ',' +
            measurement.popularity.downloads_acceleration_mean30 + ',' + measurement.popularity.downloads_acceleration_mean90 + ',' +
            measurement.popularity.downloads_acceleration_mean180 + ',' + measurement.popularity.downloads_acceleration_mean365 + ',' +
            measurement.popularity.dependents_count + ',' +
            measurement.maintenance.release_frequency_mean30 + ',' + measurement.maintenance.release_frequency_mean180 + ',' +
            measurement.maintenance.release_frequency_mean365 + ',' + measurement.maintenance.release_frequency_mean730 + ',' +
            measurement.maintenance.commits_frequency_mean30 + ',' + measurement.maintenance.commits_frequency_mean180 + ',' +
            measurement.maintenance.commits_frequency_mean365 + ',' + measurement.maintenance.is_issues_disabled + ',' +
            measurement.maintenance.is_fork + ',' + measurement.maintenance.issues_count + ',' +
            measurement.maintenance.issues_open_count + ',' + measurement.maintenance.open_issues_ratio + ',' +
            measurement.maintenance.issues_distribution_total_count + ',' +
            measurement.maintenance.issues_distribution_open_mean_days + ',' +  measurement.maintenance.package_is_stable + ',' +
            measurement.maintenance.package_is_not_deprecated + ',' + measurement.maintenance.package_has_few_issues + ',' +
            measurement.maintenance.package_has_readme + ',' + measurement.maintenance.package_has_tests + ',' +
            measurement.quality.license + ',' + measurement.quality.readme_size + ',' + measurement.quality.readme_evaluation + ',' +
            measurement.quality.linters + ',' + measurement.quality.ignore_file + ',' + measurement.quality.changelog + ',' +
            measurement.quality.is_deprecated + ',' + measurement.quality.is_stable + ',' + measurement.quality.tests_size + ',' +
            measurement.quality.tests_evaluation + ',' + measurement.quality.coverage + ',' + measurement.quality.status + ',' +
            measurement.quality.outdated_count + ',' + measurement.quality.dependencies_count + ',' + measurement.quality.vulnerabilities_count + ',' +
            measurement.quality.unlocked_count + ',' + measurement.quality.outdated_evaluation + ',' + measurement.quality.vulnerabilities_evaluation + ',' +
            measurement.quality.homepage + ',' + measurement.quality.badges_count + ',' + measurement.quality.badges_evaluation;

        fs.appendFile(outputFile, output_line + '\n', (err) => {
            if (err) log.error('package ' + name + ' failed. ' + err);
        });
    });

    rl.on('close', function (line) {
        log.info('done reading file.');
    });
}


function generate_modified_data(inputFile, outputFile) {
    var readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        if (line === '') {
            return;
        }
        // const data = {"analyzedAt":"2018-03-03T00:16:46.309Z","collected":{"metadata":{"name":"8-ball-pool-unlimited-coins-and-cash","scope":"unscoped","version":"4.0.5","description":"8-ball-pool-unlimited-coins-and-cash","date":"2018-03-03T00:16:38.128Z","publisher":{"username":"biwo","email":"woritop@ugimail.net"},"maintainers":[{"username":"biwo","email":"woritop@ugimail.net"}],"links":{"npm":"https://www.npmjs.com/package/8-ball-pool-unlimited-coins-and-cash"},"license":"ISC","releases":[{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1},{"from":"2016-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":1}],"readme":"<h3>The Best Tool Ever!!! - 8 Ball Pool Hack Coins Cheats Tool 2018. </h3><p>\r\nHello, These days I will show you 8 Ball Pool Cheats Hack Tool that will give you Limitless Coins in the game. You can MAX Everything, Unlock Almost everything with our web hack tool! This hack tool is supported on all Android & iOS devices! Just enter your username and BOOM Unlimited every little thing! Try it out now! Follow the Link down below to get your free Coins :\r\n</p>\r\n<p><center><a href=\"http://8-ball-pool.triches.cf/en.html\" rel=\"nofollow\"><img src=\"https://i.imgur.com/pBj3Onn.gif\"></a></center></p>"},"npm":{"downloads":[{"from":"2018-03-02T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":0},{"from":"2018-02-24T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":24},{"from":"2018-02-01T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":85},{"from":"2017-12-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-09-04T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118},{"from":"2017-03-03T00:00:00.000Z","to":"2018-03-03T00:00:00.000Z","count":118}],"dependentsCount":0,"starsCount":0},"source":{"files":{"readmeSize":594,"testsSize":0}}},"evaluation":{"quality":{"carefulness":0.71,"tests":0,"health":1,"branding":0},"popularity":{"communityInterest":0,"downloadsCount":39.333333333333336,"downloadsAcceleration":0.710578386605784,"dependentsCount":0},"maintenance":{"releasesFrequency":0.7591609589041095,"commitsFrequency":0,"openIssues":0,"issuesDistribution":0}},"score":{"final":0.27357862943702893,"detail":{"quality":0.5116017882410031,"popularity":0.011026362644692244,"maintenance":0.3321110458259593}}}

        const data = JSON.parse(line);
        const name = data.collected.metadata.name;

        log.debug(`Evaluating ${name}..`);

        const modified_evaluation = evaluate_modified(data.collected);
        data.evaluation = modified_evaluation;
        data.score = {};

        fs.appendFile(outputFile, JSON.stringify(data) + '\n', (err) => {
            if (err) log.error('package ' + name + ' failed. ' + err);
    });
    });

    rl.on('close', function (line) {
        log.info('done reading file.');
    });
}


function scoreQuality(quality) {
    const scores = quality;

    return weightedMean([
        [scores.carefulness, 7],
        [scores.tests, 7],
        [scores.health, 4],
        [scores.branding, 2],
    ]);
}

function scorePopularity(popularity) {
    const scores = popularity;

    return weightedMean([
        [scores.communityInterest, 2],
        [scores.downloadsCount, 2],
        [scores.downloadsAcceleration, 1],
        [scores.dependentsCount, 2],
    ]);
}

function scoreMaintenance(maintenance) {
    const scores = maintenance;

    return weightedMean([
        [scores.releasesFrequency, 2],
        [scores.commitsFrequency, 1],
        [scores.openIssues, 1],
        [scores.issuesDistribution, 2],
    ]);
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

    // get_intermediate_metrics('npms-api-data.txt', 'evaluation_from_raw_data.csv');

    // aggregate_modified('npms-api-data.txt', 'aggregation_api.json');

    // generate_modified_data('npms-api-data.txt', 'npms-modified-data.txt');

    aggregate_modified('npms-modified-data.txt', 'aggregation_modified.json');
};
