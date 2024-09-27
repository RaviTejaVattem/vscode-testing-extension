import { KarmaConfigLoader } from './karma-config-loader';

export default (config: any) => {
	new KarmaConfigLoader().loadConfig(config);
};
