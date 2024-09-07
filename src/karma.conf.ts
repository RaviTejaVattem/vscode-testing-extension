import { KarmaConfigLoader } from './karma-config-loader';

export default async (config: any) => {
	await new KarmaConfigLoader().loadConfig(config);
};
