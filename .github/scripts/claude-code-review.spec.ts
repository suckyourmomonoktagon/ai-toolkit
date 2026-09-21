import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

type WorkflowStep = {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  [key: string]: unknown;
};

type WorkflowDocument = {
  jobs: {
    triage: {
      steps: WorkflowStep[];
    };
  };
};

type ActionDocument = {
  runs: {
    steps: WorkflowStep[];
  };
};

describe('Claude Code Review workflow regression checks', () => {
  const installActionPath = join(__dirname, '../actions/install_review_cli/action.yml');
  const reviewWorkflowPath = join(__dirname, '../workflows/claude-code-review.yml');

  const readYaml = <T>(path: string): T => parse(readFileSync(path, 'utf-8')) as T;

  it('keeps triage green when review-cli installation is unavailable', () => {
    const workflow = readYaml<WorkflowDocument>(reviewWorkflowPath);
    const steps = workflow.jobs.triage.steps;
    const installStep = steps.find((step) => step.id === 'install-review-cli');
    const noteUnavailableStep = steps.find((step) => step.name === 'Note unavailable review-cli');

    expect(installStep).toBeDefined();
    expect(installStep?.if).toBe("env.HAS_REVIEW_CLI_TOKEN == 'true'");
    expect(installStep?.['continue-on-error']).toBe(true);

    expect(noteUnavailableStep).toBeDefined();
    expect(noteUnavailableStep?.if).toContain("steps.install-review-cli.outcome != 'success'");
    expect(noteUnavailableStep?.if).toContain("steps.install-review-cli.outputs.bin-path == ''");
  });

  it('treats GitHub Packages access failures as a skip in the installer action', () => {
    const action = readYaml<ActionDocument>(installActionPath);
    const installStep = action.runs.steps.find((step) => step.id === 'install');
    const script = installStep?.run ?? '';
    const warningMatches =
      script.match(
        /Unable to access @uniswap\/review-cli from GitHub Packages; continuing without AI review\./g
      ) ?? [];
    const softExitMatches = script.match(/exit 0/g) ?? [];

    expect(installStep).toBeDefined();
    expect(script).toContain('if bun add "@uniswap/review-cli@${REVIEW_CLI_VERSION}"; then');
    expect(script).toContain('package_dir="$install_dir/node_modules/@uniswap/review-cli"');
    expect(script).toContain('bin_path="$install_dir/node_modules/.bin/review-cli"');
    expect(warningMatches).toHaveLength(2);
    expect(softExitMatches.length).toBeGreaterThanOrEqual(2);
    expect(script).toMatch(
      /if \[ ! -x "\$bin_path" \]; then[\s\S]*echo "::error::bun add installed \$package_dir but \$bin_path is missing or not executable"[\s\S]*exit 1/
    );
    expect(script).toContain(
      'echo "::error::bun add installed $package_dir but $bin_path is missing or not executable"'
    );
  });
});
