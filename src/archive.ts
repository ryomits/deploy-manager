import * as fs from "fs";
import * as archiver from "archiver";

export async function archive(src: string, dest: string): Promise<{}> {
	return await new Promise((resolve, reject) => {
		const out = fs.createWriteStream(dest);
		const archive = archiver("zip");
		out.on("close", resolve);
		archive.on("error", reject);
		archive.pipe(out);
		archive.directory(src, false);
		archive.finalize();
	});
}
