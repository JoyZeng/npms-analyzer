'use strict';

const log = logger.child({ module: 'scoring_modified/finalize' });

/**
 * Finalizes the scoring cycle.
 * Updates the `npms-modified-current` alias to point to the new index and removes all the old indices and aliases.
 *
 * @param {object}  esInfo   The object with the Elasticsearch information (returned by prepare())
 * @param {Elastic} esClient The Elasticsearch instance
 *
 * @return {Promise} A promise that fulfills when done
 */
function finalize(esInfo, esClient) {
    log.info('Finalizing scoring');

    // Update `npms-modified-current` alias to point to the new index and removes `npms-modified-new` alias
    return Promise.try(() => {
        // Remove any `npms-modified-current` alias
        const actions = esInfo.aliases.current.map((index) => {
            return { remove: { index, alias: 'npms-modified-current' } };
        });

        // Remove `npms-modified-new` and add the new `npms-modified-current` aliases
        actions.push({ remove: { index: esInfo.newIndex, alias: 'npms-modified-new' } });
        actions.push({ add: { index: esInfo.newIndex, alias: 'npms-modified-current' } });

        return esClient.indices.updateAliases({ body: { actions } })
        .then(() => log.debug({ actions }, 'Updated npms-read alias'));
    })
    // Remove old indices
    .then(() => {
        const indices = esInfo.aliases.current;

        return indices.length && esClient.indices.delete({ index: indices })
        .then(() => log.debug({ indices }, 'Removed old indices pointing to npms-read'));
    })
    .return();
}

module.exports = finalize;
