import { execSync } from 'child_process';
import * as github from '@actions/github';

import getInput from './get-input';
import setOutput from './set-output';


// Get a list of tags and get the previous tag before the one that’s provided
const releaseTag = getInput('release_tag');
const tags = execSync(`git tag`).toString().trim().split('\n');
const releaseTagIndex = tags.findIndex(tag => tag === releaseTag);
// TODO: Handle when there's no previous tag
const previousTag = tags[releaseTagIndex - 1];

// Get a list of commits for a given tag by specifying a range from previous tag to the current tag
const listOfCommits = execSync(`git rev-list ${previousTag}...${releaseTag}`).toString().trim().split('\n');

const octokit = github.getOctokit(github.token);

/**
 * Retrieves PRs for provided commit_sha
 *
 * @param {Object} octokit
 * @param {string} commitSha
 *
 * @return {Object[]} - array of PRs
 */
 async function getPRs(octokit, commitSha) {
  const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: commitSha,
  });
  return result.data;
}

async function getPRsBodies() {
  // For each commit, get associated PRs and then their bodies so that we can retrieve
  // the jira ticket IDs.
  const allPrsPromises = listOfCommits.map(async commitSha => {
    const prs = await getPRs(octokit, commitSha);
    const prsBodies = prs.map(pr => pr.body).filter(Boolean);

    if (prsBodies.length) {
      return prsBodies;
    }

    return null;
  });

  const allPrsBodies = await Promise.all(allPrsPromises);

  // setOutput('prs', )
  setOutput('prs_bodies', allPrsBodies.filter(Boolean))
}


const action = getPRsBodies;


export default action;
