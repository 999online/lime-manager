#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import LimeManager from './index';

const CONFIG_DIR = path.join(os.homedir(), '.lime-manager');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

interface CliConfig {
  apiKey: string;
  apiUrl: string;
}

function loadConfig(): CliConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(config: CliConfig) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

function getClient(): LimeManager {
  const config = loadConfig();
  if (!config) {
    console.error(
      'Not logged in. Run: lime-manager login --api-key <key> [--api-url <url>]'
    );
    process.exit(1);
  }
  return new LimeManager(config.apiKey, config.apiUrl);
}

yargs(hideBin(process.argv))
  .scriptName('lime-manager')
  .command(
    'login',
    'Store an API key locally for subsequent commands',
    (y) =>
      y
        .option('api-key', { type: 'string', demandOption: true })
        .option('api-url', {
          type: 'string',
          default: process.env.LIME_MANAGER_API_URL || 'http://localhost:3000',
        }),
    (argv) => {
      saveConfig({ apiKey: argv.apiKey as string, apiUrl: argv.apiUrl as string });
      console.log(`Saved credentials to ${CONFIG_PATH}`);
    }
  )
  .command(
    'integrations',
    'List connected social integrations',
    () => {},
    async () => {
      const result = await getClient().integrations();
      console.log(JSON.stringify(result, null, 2));
    }
  )
  .command(
    'posts',
    'List posts',
    (y) =>
      y
        .option('start', { type: 'string', demandOption: true, describe: 'ISO start date' })
        .option('end', { type: 'string', demandOption: true, describe: 'ISO end date' })
        .option('customer', { type: 'string', describe: 'filter by customer/group id' }),
    async (argv) => {
      const result = await getClient().postList({
        startDate: argv.start as string,
        endDate: argv.end as string,
        customer: argv.customer as string,
      });
      console.log(JSON.stringify(result, null, 2));
    }
  )
  .command(
    'delete-post <id>',
    'Delete a post by id',
    (y) => y.positional('id', { type: 'string', demandOption: true }),
    async (argv) => {
      await getClient().deletePost(argv.id as string);
      console.log(`Deleted post ${argv.id}`);
    }
  )
  .demandCommand(1)
  .strict()
  .help()
  .parse();
