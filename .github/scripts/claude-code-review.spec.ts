import { readFileSync } from 'fs';
import { join } from 'path';

describe('Claude Code Review workflow regression checks', () => {
  const installActionPath = join(__dirname, '../actions/install_review_cli/action.yml');
  const reviewWorkflowPath = join(__dirname, '../workflows/claude-code-review.yml');

  it('keeps triage green when review-cli installation is unavailable', () => {
    const workflow = readFileSync(reviewWorkflowPath, 'utf-8');

    expect(workflow).toContain(`- name: Install review-cli
        id: install-review-cli
        if: env.HAS_REVIEW_CLI_TOKEN == 'true'
        continue-on-error: true`);
    expect(workflow).toContain(`- name: Note unavailable review-cli
        if: |
          env.HAS_REVIEW_CLI_TOKEN == 'true' &&
          (
            steps.install-review-cli.outcome != 'success' ||
            steps.install-review-cli.outputs.bin-path == ''
          )`);
  });

  it('treats GitHub Packages access failures as a skip in the installer action', () => {
    const action = readFileSync(installActionPath, 'utf-8');

    expect(action).toContain('if bun add "@uniswap/review-cli@${REVIEW_CLI_VERSION}"; then');
    expect(action).toContain(
      'echo "::warning::Unable to access @uniswap/review-cli from GitHub Packages; continuing without AI review."'
    );
    expect(action).toContain(`if [ ! -d "$package_dir" ]; then
          echo "::warning::Unable to access @uniswap/review-cli from GitHub Packages; continuing without AI review."
          exit 0
        fi`);
    expect(action).toContain(
      'echo "::error::bun add installed $package_dir but $bin_path is missing or not executable"'
    );
  });
});
