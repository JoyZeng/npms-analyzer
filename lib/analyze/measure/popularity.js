'use strict';

const moment = require('moment');
const find = require('lodash/find');

/**
 * Evaluates the downloads count.
 *
 * @param {object} collected The collected information
 *
 * @return {number} The monthly downloads mean (from 0 to Infinity)
 */
function evaluateDownloadsCount(collected) {
    const downloads = collected.npm && collected.npm.downloads;

    if (!downloads) {
        // return 0;
        return {
            downloads_count30: 0,
            downloads_count90: 0
        }
    }

    const index = downloads.findIndex((range) => moment.utc(range.to).diff(range.from, 'd') === 90);

    if (index === -1) {
        throw new Error('Could not find entry in downloads');
    }

    const count90 = downloads[index].count;
    const count30 = count90 / 3;

    // return count30;
    return {
        downloads_count30: count30,
        downloads_count90: count90
    }
}

/**
 * Evaluates the downloads acceleration.
 *
 * @param {object} collected The collected information
 *
 * @return {number} The downloads acceleration (from -Infinity to Infinity)
 */
function evaluateDownloadsAcceleration(collected) {
    const downloads = collected.npm && collected.npm.downloads;

    if (!downloads) {
        return {
            downloads_acceleration_mean30: 0,
            downloads_acceleration_mean90: 0,
            downloads_acceleration_mean180: 0,
            downloads_acceleration_mean365: 0
        }
    }

    const range30 = find(downloads, (range) => moment.utc(range.to).diff(range.from, 'd') === 30);
    const range90 = find(downloads, (range) => moment.utc(range.to).diff(range.from, 'd') === 90);
    const range180 = find(downloads, (range) => moment.utc(range.to).diff(range.from, 'd') === 180);
    const range365 = find(downloads, (range) => moment.utc(range.to).diff(range.from, 'd') === 365);

    if (!range30 || !range90 || !range180 || !range365) {
        throw new Error('Could not find entry in downloads');
    }

    const mean30 = range30.count / 30;
    const mean90 = range90.count / 90;
    const mean180 = range180.count / 180;
    const mean365 = range365.count / 365;

    // return (mean30 - mean90) * 0.25 +
    //        (mean90 - mean180) * 0.25 +
    //        (mean180 - mean365) * 0.5;

    return {
        downloads_acceleration_mean30: mean30,
        downloads_acceleration_mean90: mean90,
        downloads_acceleration_mean180: mean180,
        downloads_acceleration_mean365: mean365
    }
}

/**
 * Evaluates the community interest on the package, using its stars, forks, subscribers and contributors count.
 *
 * @param {object} collected The collected information
 *
 * @return {number} The community interest (from 0 to Infinity)
 */
function evaluateCommunityInterest(collected) {
    const starsCount = (collected.github ? collected.github.starsCount : 0) + (collected.npm ? collected.npm.starsCount : 0);
    const forksCount = collected.github ? collected.github.forksCount : 0;
    const subscribersCount = collected.github ? collected.github.subscribersCount : 0;
    const contributorsCount = collected.github ? (collected.github.contributors || []).length : 0;

    // return starsCount + forksCount + subscribersCount + contributorsCount;

    return {
        starsCount,
        forksCount,
        subscribersCount,
        contributorsCount
    }

}

// ----------------------------------------------------------------------------

/**
 * Evaluates the package popularity.
 *
 * @param {object} collected The collected information
 *
 * @return {object} The evaluation result
 */
function popularity(collected) {
    // return {
    //     communityInterest: evaluateCommunityInterest(collected),
    //     downloadsCount: evaluateDownloadsCount(collected),
    //     downloadsAcceleration: evaluateDownloadsAcceleration(collected),
    //     dependentsCount: collected.npm ? collected.npm.dependentsCount : 0,
    // };

    const communityInterest = evaluateCommunityInterest(collected)
    const downloadsCount = evaluateDownloadsCount(collected)
    const downloadsAcceleration = evaluateDownloadsAcceleration(collected)
    const dependentsCount = collected.npm ? collected.npm.dependentsCount : 0

    return {
        stars_count: communityInterest.starsCount,
        forks_count: communityInterest.forksCount,
        subscribers_count: communityInterest.subscribersCount,
        contributors_count: communityInterest.contributorsCount,
        downloads_count30: downloadsCount.downloads_count30,
        downloads_count90: downloadsCount.downloads_count90,
        downloads_acceleration_mean30: downloadsAcceleration.downloads_acceleration_mean30,
        downloads_acceleration_mean90: downloadsAcceleration.downloads_acceleration_mean90,
        downloads_acceleration_mean180: downloadsAcceleration.downloads_acceleration_mean180,
        downloads_acceleration_mean365: downloadsAcceleration.downloads_acceleration_mean365,
        dependents_count: dependentsCount
    }
}

module.exports = popularity;