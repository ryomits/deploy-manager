import * as fs from "fs";
import * as util from "util";
import * as AWS from "aws-sdk";
const readFile = util.promisify(fs.readFile);

export async function uploadBundle(bundlePath: string, bucket: string, key: string): Promise<string[]> {
	const buf = await readFile(bundlePath);
	const data = await (new AWS.S3({ apiVersion: "2006-03-01", region: "ap-northeast-1" })).putObject({
		Bucket: bucket,
		Key: key,
		Body: buf
	}).promise();
	return [data.ETag!, data.VersionId!];
}

export async function createDeployment(bucket: string, key: string, applicationName: string, deploymentGroupName: string, eTag: string, version: string): Promise<void> {
	await (new AWS.CodeDeploy({ apiVersion: "2014-10-06", region: "ap-northeast-1" })).createDeployment({
		applicationName,
		deploymentGroupName,
		revision: {
			revisionType: "S3",
			s3Location: {
				bucket,
				eTag,
				key,
				version,
				bundleType: "zip"
			}
		}
	}).promise();
}
