import { execSync } from 'child_process';
import * as github from '@actions/github';
import * as core from '@actions/core';

import getInput, { getInputWithoutDebug } from './get-input';
import setOutput from './set-output';


const token = getInputWithoutDebug('token');
const octokit = github.getOctokit(token);


/**
 * Get a list of commit SHAs between two tags, the one that's provided and the other
 * that comes just before the one that's provided.
 *
 * @return {string[]} - array of commit SHAs
 */
function getListOfCommits() {
  // Get a list of tags and get the previous tag before the one that’s provided
  const releaseTag = getInput('release_tag');
  const tags = execSync('git tag').toString().trim().split('\n');
  const releaseTagIndex = tags.findIndex(tag => tag === releaseTag);

  // If there's no previous tag, we leave it empty and we'll take all commits
  // that come before the provided tag.
  const previousTag = tags[releaseTagIndex - 1] || '';
  core.debug(`Previous tag: "${previousTag}"`);

  // Get a list of commits for a given tag by specifying a range from previous tag to the current tag
  const listOfCommits = execSync(`git rev-list ${previousTag}...${releaseTag}`).toString().trim().split('\n');
  core.debug(listOfCommits);

  return listOfCommits;
}


/**
 * Retrieves PRs for provided commit_sha
 *
 * @param {Object} octokit
 * @param {string} commitSha
 *
 * @return {Object[]} - array of PRs
 */
 async function getPRsForCommit(octokit, commitSha) {
  const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: commitSha,
  });
  return result.data;
}


/**
 * For each commit that is provided, get a list of PRs and then process it so that
 * we set outputs with a list of PRs and a string that contains concatenated bodies
 * of those PRs.
 *
 * @param {string[]} commitSHAs - list of commit SHAs
 * @return {undefined} - there's nothing to return, we just set github outputs.
 */
 async function setPRsOutputs() {
  const listOfCommits = getListOfCommits();
  const allPRsPromises = listOfCommits.map(async commitSha => {
    const prs = await getPRsForCommit(octokit, commitSha);
    const prsBodies = prs.map(pr => pr.body).filter(Boolean).join('\n');

    return {
      prs,
      prsBodies,
    };
  });

  const allPRsItems = await Promise.all(allPRsPromises);

  const allPRsBodies = allPRsItems.reduce((bodies, prItem) => {
    // If body is not empty, add it to the final string
    if (prItem.prsBodies) {
      bodies = `${bodies}${prItem.prsBodies}\n`;
    }
    return bodies;
  }, '');

  const allPRs = allPRsItems.reduce((allPRsArr,prItem) => [...allPRsArr, ...prItem.prs], []);

  setOutput('prs', allPRs);
  setOutput('prs_bodies', allPRsBodies);
}


export default setPRsOutputs;
