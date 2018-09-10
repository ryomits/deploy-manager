import * as fs from "fs";
import * as meow from "meow";
import * as path from "path";
import * as del from "del";
import * as makeDir from "make-dir";
import * as util from "util";
import * as config from "config";
import * as deploy from "./deploy";
import { archive } from "./archive";
const log = require("logalot");
const exec = util.promisify(require("child_process").exec);
const writeFile = util.promisify(fs.writeFile);
const TMP_DIR = path.join(__dirname, "../.tmp");

const cli = meow(`
  Usage: node deploySinpan
  Options:
    --branch   [Optional] ブランチ、タグ(default: master)`, {
	flags: {
		branch: {
			type: "string"
		}
	}
});

const applicationName = "app";
const branch = cli.flags.branch || "master";
const appConfig: { repo: string, bucket: string, deploymentGroup: string } = config.get(applicationName);

(async () => {
	await del([TMP_DIR]);
	await makeDir(TMP_DIR);

	await exec(`git clone -b ${branch} ${appConfig.repo} ${TMP_DIR}`);
	log.success("ソースの取得が完了しました");

	const ecosystem = require(path.join(TMP_DIR, "ecosystem.json"));
	const copyEcosystem = ecosystem.map((app: any) => {
		return Object.assign({}, app, {
			env: { NODE_ENV: process.env.NODE_ENV }
		});
	});
	await writeFile(path.join(TMP_DIR, "ecosystem.json"), JSON.stringify(copyEcosystem, null, 2), "utf8");
	await exec(`npm install --dev`, { cwd: TMP_DIR });
	await exec(`npm run build`, { cwd: TMP_DIR });
	log.success("バンドルの準備が完了しました");

	const bundlePath = `./${path.basename(appConfig.repo, ".git")}.zip`;
	await archive(TMP_DIR, bundlePath);
	log.success("バンドルが完了しました");

	const key = path.basename(bundlePath);
	const uploads = await deploy.uploadBundle(bundlePath, appConfig.bucket, key);
	log.success("バンドルのアップロードが完了しました");

	await deploy.createDeployment(appConfig.bucket, key, applicationName, appConfig.deploymentGroup, uploads[0], uploads[1]);
	await del([TMP_DIR, bundlePath]);
	log.success("デプロイが完了しました");
})().catch(err => {
	log.error("デプロイに失敗しました", err);
	process.exit(1);
});
