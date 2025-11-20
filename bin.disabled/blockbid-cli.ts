#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { chromium } from '@playwright/test';
import { createAuthenticatedPage } from '../src/auth/login';
import { createOpenTender } from '../src/flows/openTender';
import { createRestrictedTender } from '../src/flows/restrictedTender';
import { createNegotiatedProcedure } from '../src/flows/negotiatedProcedure';
import { createQualificationSystem } from '../src/flows/qualificationSystem';
import { publishAwardNotice } from '../src/flows/award';
import { dateUtils } from '../src/utils/dates';
import { validateConfig } from '../src/config/env';
import { 
  OpenTenderInput, 
  RestrictedTenderInput, 
  NegotiatedProcedureInput, 
  QualificationSystemInput,
  AwardNoticeInput 
} from '../src/types';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .scriptName('bb')
  .usage('$0 <command> [options]')
  .command('open', 'Create an open tender', (yargs) => {
    return yargs
      .option('title', {
        alias: 't',
        type: 'string',
        demandOption: true,
        describe: 'Tender title'
      })
      .option('cpv', {
        alias: 'c',
        type: 'array',
        demandOption: true,
        describe: 'CPV codes (can specify multiple)'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        demandOption: true,
        describe: 'Tender description'
      })
      .option('qa', {
        type: 'string',
        demandOption: true,
        describe: 'QA deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('deadline', {
        type: 'string',
        demandOption: true,
        describe: 'Submission deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('value', {
        type: 'number',
        describe: 'Value estimate in DKK'
      })
      .option('duration', {
        type: 'number',
        describe: 'Duration in months'
      })
      .option('internal-ref', {
        type: 'string',
        describe: 'Internal reference number'
      })
      .option('espd', {
        type: 'boolean',
        default: true,
        describe: 'Use ESPD (default: true)'
      })
      .option('espd-preset', {
        type: 'string',
        choices: ['standardDK', 'standardEU', 'custom'],
        default: 'standardDK',
        describe: 'ESPD exclusion grounds preset'
      })
      .option('documents', {
        type: 'array',
        describe: 'Document paths (format: path:audience)'
      })
      .option('criteria', {
        type: 'array',
        describe: 'Award criteria (format: name:type:weight)'
      });
  })
  .command('restricted', 'Create a restricted tender', (yargs) => {
    return yargs
      .option('title', {
        alias: 't',
        type: 'string',
        demandOption: true,
        describe: 'Tender title'
      })
      .option('cpv', {
        alias: 'c',
        type: 'array',
        demandOption: true,
        describe: 'CPV codes (can specify multiple)'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        demandOption: true,
        describe: 'Tender description'
      })
      .option('application-deadline', {
        type: 'string',
        demandOption: true,
        describe: 'Application deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('qa-application', {
        type: 'string',
        demandOption: true,
        describe: 'QA deadline for applications (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('min-invite', {
        type: 'number',
        describe: 'Minimum number of applicants to invite'
      })
      .option('max-invite', {
        type: 'number',
        describe: 'Maximum number of applicants to invite'
      })
      .option('value', {
        type: 'number',
        describe: 'Value estimate in DKK'
      })
      .option('duration', {
        type: 'number',
        describe: 'Duration in months'
      })
      .option('internal-ref', {
        type: 'string',
        describe: 'Internal reference number'
      })
      .option('espd', {
        type: 'boolean',
        default: true,
        describe: 'Use ESPD (default: true)'
      })
      .option('espd-preset', {
        type: 'string',
        choices: ['standardDK', 'standardDK', 'standardEU', 'custom'],
        default: 'standardDK',
        describe: 'ESPD exclusion grounds preset'
      })
      .option('documents', {
        type: 'array',
        describe: 'Document paths (format: path:audience)'
      })
      .option('criteria', {
        type: 'array',
        describe: 'Award criteria (format: name:type:weight)'
      });
  })
  .command('negotiated', 'Create a negotiated procedure', (yargs) => {
    return yargs
      .option('title', {
        alias: 't',
        type: 'string',
        demandOption: true,
        describe: 'Tender title'
      })
      .option('cpv', {
        alias: 'c',
        type: 'array',
        demandOption: true,
        describe: 'CPV codes (can specify multiple)'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        demandOption: true,
        describe: 'Tender description'
      })
      .option('application-deadline', {
        type: 'string',
        demandOption: true,
        describe: 'Application deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('qa-application', {
        type: 'string',
        demandOption: true,
        describe: 'QA deadline for applications (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('min-invite', {
        type: 'number',
        describe: 'Minimum number of applicants to invite'
      })
      .option('max-invite', {
        type: 'number',
        describe: 'Maximum number of applicants to invite'
      })
      .option('rounds', {
        type: 'number',
        default: 1,
        describe: 'Number of negotiation rounds (default: 1)'
      })
      .option('initial-offers', {
        type: 'boolean',
        default: false,
        describe: 'Require initial offers'
      })
      .option('initial-deadline', {
        type: 'string',
        describe: 'Initial offers deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('final-deadline', {
        type: 'string',
        describe: 'Final offers deadline (ISO format or dd-MM-yyyy HH:mm)'
      })
      .option('justification', {
        type: 'string',
        describe: 'Justification for negotiation'
      })
      .option('value', {
        type: 'number',
        describe: 'Value estimate in DKK'
      })
      .option('duration', {
        type: 'number',
        describe: 'Duration in months'
      })
      .option('internal-ref', {
        type: 'string',
        describe: 'Internal reference number'
      })
      .option('espd', {
        type: 'boolean',
        default: true,
        describe: 'Use ESPD (default: true)'
      })
      .option('espd-preset', {
        type: 'string',
        choices: ['standardDK', 'standardEU', 'custom'],
        default: 'standardDK',
        describe: 'ESPD exclusion grounds preset'
      })
      .option('documents', {
        type: 'array',
        describe: 'Document paths (format: path:audience)'
      })
      .option('criteria', {
        type: 'array',
        describe: 'Award criteria (format: name:type:weight)'
      });
  })
  .command('kval', 'Create a qualification system', (yargs) => {
    return yargs
      .option('title', {
        alias: 't',
        type: 'string',
        demandOption: true,
        describe: 'Qualification system title'
      })
      .option('cpv', {
        alias: 'c',
        type: 'array',
        demandOption: true,
        describe: 'CPV codes (can specify multiple)'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        demandOption: true,
        describe: 'System description'
      })
      .option('categories', {
        type: 'array',
        demandOption: true,
        describe: 'Categories (e.g., "El", "VVS")'
      })
      .option('internal-ref', {
        type: 'string',
        describe: 'Internal reference number'
      })
      .option('espd', {
        type: 'boolean',
        default: true,
        describe: 'Use ESPD (default: true)'
      })
      .option('espd-preset', {
        type: 'string',
        choices: ['standardDK', 'standardEU', 'custom'],
        default: 'standardDK',
        describe: 'ESPD exclusion grounds preset'
      })
      .option('documents', {
        type: 'array',
        describe: 'Document paths (format: path:audience)'
      });
  })
  .command('award', 'Publish award notice', (yargs) => {
    return yargs
      .option('tender-title', {
        alias: 't',
        type: 'string',
        demandOption: true,
        describe: 'Title of the tender to award'
      })
      .option('winner', {
        alias: 'w',
        type: 'string',
        demandOption: true,
        describe: 'Winner name'
      })
      .option('reg-no', {
        type: 'string',
        describe: 'Winner registration number (CVR)'
      })
      .option('value', {
        type: 'number',
        describe: 'Contract value in DKK'
      });
  })
  .option('headless', {
    type: 'boolean',
    default: true,
    describe: 'Run in headless mode'
  })
  .option('slow-mo', {
    type: 'number',
    default: 0,
    describe: 'Slow down operations by specified milliseconds'
  })
  .option('timeout', {
    type: 'number',
    default: 30000,
    describe: 'Timeout in milliseconds'
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .demandCommand(1, 'You must specify a command')
  .parseSync();

// Main execution function
async function main() {
  try {
    // Validate configuration
    validateConfig();

    // Launch browser
    const browser = await chromium.launch({
      headless: argv.headless,
      slowMo: argv['slow-mo']
    });

    try {
      // Create authenticated page
      const page = await createAuthenticatedPage(browser, {
        headless: argv.headless,
        slowMo: argv['slow-mo'],
        timeout: argv.timeout
      });

      // Execute command
      await executeCommand(page, argv);

      console.log('✅ Command executed successfully');
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Execute the appropriate command
async function executeCommand(page: any, args: any) {
  const command = args._[0];

  switch (command) {
    case 'open':
      await executeOpenTender(page, args);
      break;
    case 'restricted':
      await executeRestrictedTender(page, args);
      break;
    case 'negotiated':
      await executeNegotiatedProcedure(page, args);
      break;
    case 'kval':
      await executeQualificationSystem(page, args);
      break;
    case 'award':
      await executeAwardNotice(page, args);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Execute open tender command
async function executeOpenTender(page: any, args: any) {
  const input: OpenTenderInput = {
    title: args.title,
    internalRef: args['internal-ref'],
    cpv: args.cpv as string[],
    description: args.description,
    valueEstimate: args.value,
    duration: args.duration ? { months: args.duration } : undefined,
    documents: parseDocuments(args.documents),
    tildelingskriterier: parseCriteria(args.criteria),
    espd: {
      useESPD: args.espd,
      exclusionGroundsPreset: args['espd-preset'],
      selectionCriteria: [
        { type: 'economic', value: 'Finansiel stabilitet' },
        { type: 'technical', value: 'Teknisk kapacitet' },
        { type: 'experience', value: 'Erfaring med lignende projekter' }
      ]
    },
    qa: {
      qaDeadline: args.qa,
      qaScope: 'tender'
    },
    deadlines: {
      submissionDeadline: args.deadline,
      blockLateSubmissions: true
    }
  };

  await createOpenTender(page, input);
}

// Execute restricted tender command
async function executeRestrictedTender(page: any, args: any) {
  const input: RestrictedTenderInput = {
    title: args.title,
    internalRef: args['internal-ref'],
    cpv: args.cpv as string[],
    description: args.description,
    valueEstimate: args.value,
    duration: args.duration ? { months: args.duration } : undefined,
    documents: parseDocuments(args.documents),
    tildelingskriterier: parseCriteria(args.criteria),
    espd: {
      useESPD: args.espd,
      exclusionGroundsPreset: args['espd-preset'],
      selectionCriteria: [
        { type: 'economic', value: 'Finansiel stabilitet' },
        { type: 'technical', value: 'Teknisk kapacitet' },
        { type: 'experience', value: 'Erfaring med lignende projekter' }
      ]
    },
    qaApplication: {
      qaDeadline: args['qa-application'],
      qaScope: 'application'
    },
    applicationDeadline: args['application-deadline'],
    minInvite: args['min-invite'],
    maxInvite: args['max-invite']
  };

  await createRestrictedTender(page, input);
}

// Execute negotiated procedure command
async function executeNegotiatedProcedure(page: any, args: any) {
  const input: NegotiatedProcedureInput = {
    title: args.title,
    internalRef: args['internal-ref'],
    cpv: args.cpv as string[],
    description: args.description,
    valueEstimate: args.value,
    duration: args.duration ? { months: args.duration } : undefined,
    documents: parseDocuments(args.documents),
    tildelingskriterier: parseCriteria(args.criteria),
    espd: {
      useESPD: args.espd,
      exclusionGroundsPreset: args['espd-preset'],
      selectionCriteria: [
        { type: 'economic', value: 'Finansiel stabilitet' },
        { type: 'technical', value: 'Teknisk kapacitet' },
        { type: 'experience', value: 'Erfaring med lignende projekter' }
      ]
    },
    qaApplication: {
      qaDeadline: args['qa-application'],
      qaScope: 'application'
    },
    applicationDeadline: args['application-deadline'],
    minInvite: args['min-invite'],
    maxInvite: args['max-invite'],
    requireInitialOffers: args['initial-offers'],
    rounds: args.rounds,
    initialOfferDeadline: args['initial-deadline'],
    finalOfferDeadline: args['final-deadline'],
    justification: args.justification
  };

  await createNegotiatedProcedure(page, input);
}

// Execute qualification system command
async function executeQualificationSystem(page: any, args: any) {
  const input: QualificationSystemInput = {
    title: args.title,
    internalRef: args['internal-ref'],
    cpv: args.cpv as string[],
    description: args.description,
    documents: parseDocuments(args.documents),
    espd: {
      useESPD: args.espd,
      exclusionGroundsPreset: args['espd-preset'],
      selectionCriteria: [
        { type: 'economic', value: 'Finansiel stabilitet' },
        { type: 'technical', value: 'Teknisk kapacitet' },
        { type: 'experience', value: 'Erfaring med lignende projekter' }
      ]
    },
    openEnded: true,
    categories: args.categories as string[]
  };

  await createQualificationSystem(page, input);
}

// Execute award notice command
async function executeAwardNotice(page: any, args: any) {
  const input: AwardNoticeInput = {
    tenderTitle: args['tender-title'],
    winnerName: args.winner,
    winnerRegNo: args['reg-no'],
    contractValue: args.value
  };

  await publishAwardNotice(page, input);
}

// Parse documents from command line arguments
function parseDocuments(documents: string[] | undefined): Array<{ path: string; audience: 'all' | 'prequalified' | 'invited' }> {
  if (!documents) return [];

  return documents.map(doc => {
    const [path, audience] = doc.split(':');
    return {
      path,
      audience: (audience as 'all' | 'prequalified' | 'invited') || 'all'
    };
  });
}

// Parse criteria from command line arguments
function parseCriteria(criteria: string[] | undefined): Array<{ name: string; weight?: number; type: 'price' | 'quality' | 'cost' | 'other' }> {
  if (!criteria) return [];

  return criteria.map(criterion => {
    const [name, type, weight] = criterion.split(':');
    return {
      name,
      type: (type as 'price' | 'quality' | 'cost' | 'other') || 'other',
      weight: weight ? parseInt(weight) : undefined
    };
  });
}

// Run the CLI
if (require.main === module) {
  main();
}
