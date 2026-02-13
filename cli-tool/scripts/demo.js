#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';

console.log(chalk.bold.blue('\n🚀 Codeflow Commander - Demo Mode\n'));

const steps = [
    { text: 'Loading configuration...', time: 500 },
    { text: 'Connecting to Enterprise Knowledge Graph...', time: 800 },
    { text: 'Analyzing staged changes...', time: 1200 },
    { text: 'Querying Vector Store for context...', time: 1500 },
    { text: 'Running Compliance Engine (GDPR, HIPAA, SOC2)...', time: 1000 },
    { text: 'Synthesizing AI Review...', time: 2000 }
];

async function runDemo() {
    for (const step of steps) {
        const spinner = ora(step.text).start();
        await new Promise(resolve => setTimeout(resolve, step.time));
        spinner.succeed();
    }

    console.log('\n' + chalk.bold('📝 AI Analysis Result:'));
    console.log(chalk.green('⭐ Rating: 9/10'));
    console.log(chalk.cyan('Summary: Excellent implementation of the new authentication flow. Secure and performant.'));

    console.log('\n' + chalk.yellow('⚠️  Issues:'));
    console.log(chalk.gray('- None found. Great job!'));

    console.log('\n' + chalk.blue('💡 Recommendations:'));
    console.log(chalk.gray('- Consider adding a unit test for the edge case where the token expires exactly at the boundary.'));

    console.log('\n' + chalk.green('✅ Quality Gate Passed. Ready to commit.'));
}

runDemo();
