import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';

const execAsync = promisify(exec);

/**
 * GitHub Client - Handles GitHub API operations and repository cloning
 *
 * Provides methods for authenticating with GitHub, cloning repositories,
 * and interacting with the GitHub API.
 */
export class GitHubClient {
  private octokit: Octokit | null = null;
  private git = simpleGit();

  constructor() {
    this.initializeOctokit();
  }

  /**
   * Initialize GitHub API client if token is available
   */
  private initializeOctokit(): void {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      this.octokit = new Octokit({
        auth: token,
      });
      console.log('GitHub API client initialized with authentication');
    } else {
      console.warn('GitHub API client initialized without authentication (limited functionality)');
    }
  }

  /**
   * Clone repository to local directory
   */
  async cloneRepository(cloneUrl: string, localPath: string): Promise<void> {
    try {
      console.log(`Cloning repository from ${cloneUrl} to ${localPath}`);

      // Use simple-git for cloning
      await this.git.clone(cloneUrl, localPath);

      // Verify the clone was successful
      const clonedGit = simpleGit(localPath);
      const isRepo = await clonedGit.checkIsRepo();

      if (!isRepo) {
        throw new Error('Cloned directory is not a valid git repository');
      }

      console.log('Repository cloned successfully');

    } catch (error) {
      console.error(`Failed to clone repository: ${cloneUrl}`, error);
      throw new Error(`Git clone failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clone repository with a specific branch
   */
  async cloneRepositoryBranch(cloneUrl: string, localPath: string, branch: string): Promise<void> {
    try {
      console.log(`Cloning repository ${cloneUrl} branch ${branch} to ${localPath}`);

      // Clone with specific branch
      await this.git.clone(cloneUrl, localPath, ['--single-branch', '--branch', branch]);

      console.log('Repository branch cloned successfully');

    } catch (error) {
      console.error(`Failed to clone repository branch: ${cloneUrl} ${branch}`, error);
      throw new Error(`Git clone branch failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get repository information from GitHub API
   */
  async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    if (!this.octokit) {
      throw new Error('GitHub client not authenticated - GITHUB_TOKEN required');
    }

    try {
      const response = await this.octokit.repos.get({
        owner,
        repo
      });

      return {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        owner: response.data.owner.login,
        private: response.data.private,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        language: response.data.language,
        size: response.data.size,
        forks: response.data.forks,
        watchers: response.data.watchers,
        stars: response.data.stargazers_count,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        pushed_at: response.data.pushed_at
      };
    } catch (error) {
      console.error(`Failed to get repository info for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Validate that a repository URL is accessible
   */
  async validateRepositoryUrl(cloneUrl: string): Promise<boolean> {
    try {
      // Try a shallow clone to test access
      const tempDir = `/tmp/repo-validation-${Date.now()}`;

      await this.git.clone(cloneUrl, tempDir, ['--depth', '1', '--no-checkout']);

      // Cleanup
      await execAsync(`rm -rf "${tempDir}"`);

      return true;
    } catch (error) {
      console.warn(`Repository URL validation failed for ${cloneUrl}:`, error);
      return false;
    }
  }

  /**
   * Get contents of a repository file
   */
  async getFileContents(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string> {
    if (!this.octokit) {
      throw new Error('GitHub client not authenticated - GITHUB_TOKEN required');
    }

    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      if (Array.isArray(response.data) || response.data.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }

      const content = Buffer.from(response.data.content, 'base64').toString();
      return content;
    } catch (error) {
      console.error(`Failed to get file contents ${owner}/${repo}/${path}:`, error);
      throw error;
    }
  }

  /**
   * Get repository contributors
   */
  async getContributors(owner: string, repo: string): Promise<any[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not authenticated - GITHUB_TOKEN required');
    }

    try {
      const response = await this.octokit.repos.listContributors({
        owner,
        repo,
        per_page: 100
      });

      return response.data.map(contributor => ({
        login: contributor.login,
        id: contributor.id,
        type: contributor.type,
        contributions: contributor.contributions,
        avatar_url: contributor.avatar_url
      }));
    } catch (error) {
      console.error(`Failed to get contributors for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Check if the current authentication has access to a repository
   */
  async checkRepositoryAccess(owner: string, repo: string): Promise<{
    hasAccess: boolean;
    permissions: any;
  }> {
    if (!this.octokit) {
      return { hasAccess: false, permissions: null };
    }

    try {
      // Try to get repository info with current auth
      const response = await this.octokit.repos.get({
        owner,
        repo
      });

      return {
        hasAccess: true,
        permissions: response.data.permissions
      };
    } catch (error: any) {
      if (error.status === 404) {
        // Repository not found or no access
        return { hasAccess: false, permissions: null };
      }
      throw error;
    }
  }

  /**
   * Get list of repositories for an organization (requires org access)
   */
  async getOrganizationRepositories(org: string): Promise<any[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not authenticated - GITHUB_TOKEN required');
    }

    try {
      const response = await this.octokit.repos.listForOrg({
        org,
        type: 'all',
        per_page: 100
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language,
        size: repo.size,
        pushed_at: repo.pushed_at
      }));
    } catch (error) {
      console.error(`Failed to get organization repositories for ${org}:`, error);
      throw error;
    }
  }
}
