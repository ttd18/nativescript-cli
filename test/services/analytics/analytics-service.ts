import { AnalyticsService } from '../../../lib/services/analytics/analytics-service';
import { Yok } from "../../../lib/common/yok";
import * as stubs from "../../stubs";
import { assert } from "chai";

const trackFeatureUsage = "TrackFeatureUsage";
const createTestInjector = (): IInjector => {
	const testInjector = new Yok();
	testInjector.register("logger", stubs.LoggerStub);
	testInjector.register("options", {});

	testInjector.register("staticConfig", {
		disableAnalytics: false,
		TRACK_FEATURE_USAGE_SETTING_NAME: trackFeatureUsage,
		PATH_TO_BOOTSTRAP: "pathToBootstrap.js"
	});

	testInjector.register("prompter", {

	});

	testInjector.register("userSettingsService", {
		getSettingValue: async (settingName: string): Promise<any> => {
			return "setting";
		}
	});
	testInjector.register("analyticsSettingsService", {
		canDoRequest: (): Promise<boolean> => Promise.resolve(true)
	});
	testInjector.register("osInfo", {});
	testInjector.register("childProcess", {});
	testInjector.register("processService", {});
	testInjector.register("projectDataService", {});
	testInjector.register("mobileHelper", {});

	return testInjector;
};

describe("analyticsService", () => {
	describe("trackInGoogleAnalytics", () => {
		describe("does not track", () => {
			const testScenario = async (configuration: {
				disableAnalytics: boolean,
				assertMessage: string,
				userSettingsServiceOpts?: { trackFeatureUsageValue: string, defaultValue: string }
			}) => {
				const testInjector = createTestInjector();
				const staticConfig = testInjector.resolve<Config.IStaticConfig>("staticConfig");
				staticConfig.disableAnalytics = true;

				configuration.userSettingsServiceOpts = configuration.userSettingsServiceOpts || { trackFeatureUsageValue: "false", defaultValue: "true" };
				const userSettingsService = testInjector.resolve<any>("userSettingsService");
				userSettingsService.getSettingValue = async (settingName: string): Promise<string> => {
					if (settingName === trackFeatureUsage) {
						return configuration.userSettingsServiceOpts.trackFeatureUsageValue;
					}

					return configuration.userSettingsServiceOpts.defaultValue;
				};

				let isChildProcessSpawned = false;
				const childProcess = testInjector.resolve<IChildProcess>("childProcess");
				childProcess.spawn = (command: string, args?: string[], options?: any): any => {
					isChildProcessSpawned = true;
				};

				const analyticsService = testInjector.resolve<IAnalyticsService>(AnalyticsService);
				await analyticsService.trackInGoogleAnalytics({
					googleAnalyticsDataType: GoogleAnalyticsDataType.Page,
					customDimensions: {
						"customDimension1": "value1"
					}
				});

				assert.isFalse(isChildProcessSpawned, "When staticConfig.disableAnalytics is false, no child process should be started, i.e. we should not track anything.");
			};

			it("does not track when staticConfig's disableAnalytics is true", () => {
				return testScenario({
					disableAnalytics: true,
					assertMessage: "When staticConfig.disableAnalytics is true, no child process should be started, i.e. we should not track anything."
				});
			});

			it(`does not track when ${trackFeatureUsage} is not true`, async () => {
				await testScenario({
					disableAnalytics: false,
					assertMessage: `When ${trackFeatureUsage} is false, no child process should be started, i.e. we should not track anything.`,
					userSettingsServiceOpts: {
						trackFeatureUsageValue: "false", defaultValue: "true"
					}
				});

				await testScenario({
					disableAnalytics: false,
					assertMessage: `When ${trackFeatureUsage} is false, no child process should be started, i.e. we should not track anything.`,
					userSettingsServiceOpts: {
						trackFeatureUsageValue: undefined, defaultValue: "true"
					}
				});
			});

		});
	});
});
