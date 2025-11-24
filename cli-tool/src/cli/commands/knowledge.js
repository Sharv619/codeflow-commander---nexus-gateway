import chalk from 'chalk';
import { getProjectStore, initProjectStore } from '../../knowledge/projectStore.js';
import { getGraphService, initGraphService } from '../../knowledge/graphService.js';
import { loadConfig } from '../../utils/config.js';

/**
 * cli-tool/src/cli/commands/knowledge.js
 * Knowledge CLI commands for codeflow-hook
 * Provides interface to Phase 3 & 4 knowledge services
 */

/**
 * Handle knowledge search command
 */
export async function handleKnowledgeSearch(codeSnippet, options = {}) {
  const config = loadConfig();

  if (!config.enableKnowledgeStore) {
    console.log(chalk.red('❌ Knowledge store not enabled. Enable with: codeflow-hook config --enable-knowledge-store true'));
    return;
  }

  try {
    console.log(chalk.blue('🔍 Searching local knowledge store for similar code...'));

    const store = getProjectStore();

    // Initialize if needed
    if (!store.initialized) {
      await initProjectStore();
    }

    const results = await store.searchSimilar(codeSnippet, options.topK || 5);

    if (results.length === 0) {
      console.log(chalk.yellow('ℹ️  No similar suggestions found in knowledge store'));
      console.log(chalk.gray('💡 Store suggestions by running code analysis with knowledge store enabled'));
      return;
    }

    console.log(chalk.green(`✅ Found ${results.length} similar suggestions:`));
    console.log('');

    results.forEach((suggestion, index) => {
      console.log(chalk.cyan(`📋 Suggestion ${index + 1}:`));
      console.log(`   ${chalk.bold(suggestion.title)}`);
      console.log(`   Type: ${suggestion.type} | Severity: ${suggestion.severity}`);
      console.log(`   Created: ${new Date(suggestion.createdAt).toLocaleDateString()}`);

      if (options.verbose) {
        console.log(`   Description: ${suggestion.description.substring(0, 200)}${suggestion.description.length > 200 ? '...' : ''}`);
      }

      console.log('');
    });

    console.log(chalk.gray(`💡 Use: codeflow-hook knowledge search "your code here" --verbose`));

  } catch (error) {
    console.error(chalk.red(`❌ Search failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Handle knowledge graph status command
 */
export async function handleKnowledgeGraphStatus(options = {}) {
  const config = loadConfig();

  if (!config.enableEnterpriseGraph) {
    console.log(chalk.red('❌ Enterprise graph not enabled.'));
    console.log(chalk.gray('   Enable with: codeflow-hook config --enable-enterprise-graph true'));
    console.log(chalk.gray('   Set GRAPH_URL, GRAPH_USER, and GRAPH_PASS environment variables or config'));
    return;
  }

  try {
    console.log(chalk.blue('🌐 Checking enterprise knowledge graph status...'));

    const service = getGraphService();

    // Initialize if needed
    if (!service.initialized) {
      await initGraphService({
        url: config.graphUrl,
        user: config.graphUser,
        password: config.graphPass
      });
    }

    const stats = await service.getStats();

    if (!stats.initialized) {
      console.log(chalk.red('❌ Enterprise graph not connected'));
      return;
    }

    console.log(chalk.green('✅ Enterprise Knowledge Graph Status:'));
    console.log('');
    console.log(chalk.gray(`🏗️  Neo4j URL: ${stats.url || 'Unknown'}`));
    console.log(chalk.gray(`📊 Repositories: ${stats.repositories || 0}`));
    console.log(chalk.gray(`🔗 Dependencies: ${stats.dependencies || 0}`));
    console.log(chalk.gray(`🧠 Patterns: ${stats.patterns || 0}`));
    console.log(chalk.gray(`⏰ Last Sync: ${stats.lastSync || 'Never'}`));

    if (stats.repositories > 0) {
      const avgDepsPerRepo = stats.repositories > 0 ? (stats.dependencies / stats.repositories).toFixed(1) : 0;
      console.log('');
      console.log(chalk.blue('📈 Insights:'));
      console.log(chalk.gray(`   Avg dependencies per repository: ${avgDepsPerRepo}`));
    }

  } catch (error) {
    console.error(chalk.red(`❌ Graph status check failed: ${error.message}`));

    if (error.message.includes('authentication') || error.message.includes('authorization')) {
      console.log(chalk.gray('💡 Check your GRAPH_USER and GRAPH_PASS credentials'));
    }

    process.exit(1);
  }
}

/**
 * Handle knowledge forecast command
 */
export async function handleKnowledgeForecast(repositoryId, options = {}) {
  const config = loadConfig();

  if (!config.enableEnterpriseGraph) {
    console.log(chalk.red('❌ Enterprise graph not enabled for forecast.'));
    console.log(chalk.gray('   Enable with: codeflow-hook config --enable-enterprise-graph true'));
    return;
  }

  if (!repositoryId) {
    console.log(chalk.red('❌ Repository ID required for forecast'));
    console.log(chalk.gray('   Usage: codeflow-hook knowledge forecast <repository-id>'));
    process.exit(1);
  }

  try {
    console.log(chalk.blue(`📊 Forecasting technical debt for repository: ${repositoryId}`));

    const service = getGraphService();

    // Initialize if needed
    if (!service.initialized) {
      await initGraphService({
        url: config.graphUrl,
        user: config.graphUser,
        password: config.graphPass
      });
    }

    const forecast = await service.forecastTechnicalDebt(repositoryId);

    if (!forecast) {
      console.log(chalk.red('❌ Forecast not available for this repository'));
      console.log(chalk.gray('   Repository may not exist in knowledge graph or has insufficient data'));
      return;
    }

    console.log('');
    console.log(chalk.cyan(`🏗️  Technical Debt Forecast - ${repositoryId}`));
    console.log('');

    // Current state
    const currentScore = forecast.currentState?.debtScore || 0;
    const riskColor = currentScore > 70 ? chalk.red :
                     currentScore > 40 ? chalk.yellow : chalk.green;

    console.log(chalk.blue('📊 Current State:'));
    console.log(`   Technical Debt Score: ${riskColor}${currentScore}/100`);
    console.log(`   Maintenance Velocity: ${forecast.currentState?.maintenanceVelocity?.toFixed(2) || 0} commits/day`);
    console.log(`   Code Quality Trend: ${forecast.currentState?.codeQualityTrend > 0 ? '📈 Improving' : forecast.currentState?.codeQualityTrend < 0 ? '📉 Declining' : '➡️ Stable'}`);
    console.log('');

    // Projections
    if (forecast.projections) {
      console.log(chalk.blue('🔮 Projections:'));

      const renderProjection = (label, projection) => {
        const score = projection.predictedDebt;
        const riskColor = score > 80 ? chalk.red :
                         score > 60 ? chalk.yellow :
                         score > 40 ? chalk.blue : chalk.green;
        const confidence = `(${projection.confidenceLower}-${projection.confidenceUpper})`;

        console.log(`   ${label}: ${riskColor}${score}/100 ${chalk.gray(confidence)}`);
      };

      renderProjection('3 months', forecast.projections.shortTerm);
      renderProjection('6 months', forecast.projections.mediumTerm);
      renderProjection('12 months', forecast.projections.longTerm);
      console.log('');
    }

    // Recommendations
    if (forecast.recommendations && forecast.recommendations.length > 0) {
      console.log(chalk.blue('💡 Recommendations:'));

      forecast.recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'critical' ? chalk.red :
                             rec.priority === 'high' ? chalk.yellow : chalk.blue;
        console.log(`   ${index + 1}. ${priorityColor}[${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`      ${rec.description}`);
        console.log(`      Effort: ${rec.effort}/10 | Impact: ${rec.impact}/10`);
      });
      console.log('');
    }

    console.log(chalk.gray('📅 Forecast generated based on repository activity, dependencies, and patterns'));
    console.log(chalk.gray('🧠 Powered by enterprise knowledge graph intelligence'));

  } catch (error) {
    console.error(chalk.red(`❌ Forecast failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Handle knowledge stats command
 */
export async function handleKnowledgeStats(options = {}) {
  const config = loadConfig();

  console.log(chalk.cyan('🧠 Codeflow Hook Knowledge Systems Status'));
  console.log('');

  // Local Knowledge Store
  console.log(chalk.blue('🏛️  Local Knowledge Store:'));

  if (config.enableKnowledgeStore) {
    try {
      const store = getProjectStore();

      if (!store.initialized) {
        await initProjectStore();
      }

      const stats = await store.getStats();

      console.log(`   Status: ${stats.initialized ? chalk.green('✅ Connected') : chalk.red('❌ Disconnected')}`);
      console.log(`   Suggestions: ${chalk.cyan(stats.suggestions || 0)}`);
      console.log(`   Feedback: ${chalk.cyan(stats.feedback || 0)}`);
      console.log(`   Sessions: ${chalk.cyan(stats.sessions || 0)}`);
      console.log(`   Embeddings: ${stats.embeddingsEnabled ? chalk.green('✅ Enabled') : chalk.yellow('⚠️ Unavailable')}`);
      console.log(`   Storage: ${chalk.gray(stats.dbPath || '~/.codeflow-hook/project.db')}`);

    } catch (error) {
      console.log(`   Status: ${chalk.red('❌ Error')} - ${error.message}`);
    }
  } else {
    console.log(`   Status: ${chalk.gray('❌ Disabled')} (enable with --enable-knowledge-store)`);
  }

  console.log('');

  // Enterprise Graph
  console.log(chalk.blue('🌐 Enterprise Knowledge Graph:'));

  if (config.enableEnterpriseGraph) {
    try {
      const service = getGraphService();

      if (!service.initialized) {
        await initGraphService({
          url: config.graphUrl,
          user: config.graphUser,
          password: config.graphPass
        });
      }

      const stats = await service.getStats();

      console.log(`   Status: ${stats.initialized ? chalk.green('✅ Connected') : chalk.red('❌ Disconnected')}`);
      console.log(`   Repositories: ${chalk.cyan(stats.repositories || 0)}`);
      console.log(`   Dependencies: ${chalk.cyan(stats.dependencies || 0)}`);
      console.log(`   Patterns: ${chalk.cyan(stats.patterns || 0)}`);
      console.log(`   Last Sync: ${chalk.gray(stats.lastSync || 'Never')}`);
      console.log(`   URL: ${chalk.gray(stats.url?.replace(/:\/\/.*@/, '://***:***@') || 'Not configured')}`);

    } catch (error) {
      console.log(`   Status: ${chalk.red('❌ Error')} - ${error.message}`);
    }
  } else {
    console.log(`   Status: ${chalk.gray('❌ Disabled')} (enable with --enable-enterprise-graph)`);
  }

  console.log('');

  // Usage hints
  const features = [];
  if (config.enableKnowledgeStore) {
    features.push('local search');
  }
  if (config.enableEnterpriseGraph) {
    features.push('graph analytics', 'technical debt forecasting');
  }

  if (features.length > 0) {
    console.log(chalk.blue('🚀 Active Features:'));
    features.forEach(feature => {
      console.log(`   • ${feature}`);
    });
  } else {
    console.log(chalk.yellow('💡 No knowledge features enabled. Enable them with:'));
    console.log(chalk.gray('   codeflow-hook config --enable-knowledge-store true'));
    console.log(chalk.gray('   codeflow-hook config --enable-enterprise-graph true'));
  }
}

/**
 * Handle knowledge clear command (reset local store)
 */
export async function handleKnowledgeClear(options = {}) {
  const config = loadConfig();

  if (!config.enableKnowledgeStore) {
    console.log(chalk.red('❌ Knowledge store not enabled'));
    return;
  }

  try {
    console.log(chalk.yellow('⚠️  This will clear all stored suggestions and feedback'));

    if (options.force || options.yes) {
      const store = getProjectStore();
      await store.reset();
      console.log(chalk.green('✅ Knowledge store cleared'));
    } else {
      console.log(chalk.cyan('Use --force or --yes to confirm clearing'));
    }

  } catch (error) {
    console.error(chalk.red(`❌ Failed to clear knowledge store: ${error.message}`));
    process.exit(1);
  }
}
