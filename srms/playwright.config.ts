import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Serial mode for flow-based tests
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    timeout: 120_000,

    // Advanced reporting: HTML + JSON for CI dashboards
    reporter: isCI
        ? [
              ['github'],
              ['html', { open: 'never', outputFolder: 'playwright-report' }],
              ['json', { outputFile: 'test-results/results.json' }],
          ]
        : [['html', { open: 'on-failure' }]],

    // Screenshot & trace policies
    use: {
        baseURL,
        trace: isCI ? 'on-first-retry' : 'retain-on-failure',
        screenshot: isCI ? 'on' : 'only-on-failure',
        video: isCI ? 'retain-on-failure' : 'off',
        // Timeouts
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
    },

    // Output directories
    outputDir: 'test-results',

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npx next dev --port 3000',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
    },
});
