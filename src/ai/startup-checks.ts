
import chalk from 'chalk';

export function runStartupChecks() {
  console.log(chalk.bold.yellow('🚀 Running Earth Insights Dashboard Startup Checks...'));

  let allKeysValid = true;

  // Check for Gemini API Key
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      chalk.yellow.bold('⚠️  Warning:'),
      chalk.yellow('GEMINI_API_KEY is not configured.')
    );
    console.log(
      chalk.gray('   AI-powered features like insights generation and chatbot will be disabled.')
    );
    console.log(
      chalk.gray('   To enable them, add `GEMINI_API_KEY="your-key"` to your `.env.local` file.')
    );
     allKeysValid = false;
  } else {
     console.log(chalk.green('✅ GEMINI_API_KEY configured.'));
  }
  
  // Check for Google Application Credentials (for Earth Engine)
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
     console.warn(
      chalk.yellow.bold('⚠️  Warning:'),
      chalk.yellow('GOOGLE_APPLICATION_CREDENTIALS_JSON is not configured.')
    );
    console.log(
      chalk.gray('   Core satellite data processing via Google Earth Engine will not function.')
    );
     console.log(
      chalk.gray('   Please ensure the environment variable points to a valid JSON key file.')
    );
    allKeysValid = false;
  } else {
     console.log(chalk.green('✅ GOOGLE_APPLICATION_CREDENTIALS_JSON configured.'));
  }

  if (allKeysValid) {
    console.log(chalk.bold.green('🎉 All configurations are set up correctly!'));
  } else {
     console.log(chalk.bold.red('❌ Some configurations are missing. Please review the warnings above.'));
  }
}
